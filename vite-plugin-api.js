import { existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Dev-only bridge: serves api/**\/*.js as Vercel-style Edge handlers.
 *
 * Vercel runs these handlers with Web Request/Response. Vite's dev server
 * speaks Node req/res, so this adapts between the two. Without it every
 * /api/* route 404s under `npm run dev`.
 *
 * Uses ssrLoadModule so editing a handler picks up without a restart.
 */
export function apiRoutes(env = {}) {
  return {
    name: "local-api-routes",
    apply: "serve",
    configureServer(server) {
      // Handlers read process.env; mirror Vite's loaded env into it.
      for (const [k, v] of Object.entries(env)) {
        if (process.env[k] === undefined) process.env[k] = v;
      }

      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/")) return next();

        const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

        // /api/auth/verify -> ./api/auth/verify.js
        const rel = `api${url.pathname.slice(4)}.js`;

        // Vercel does not deploy _-prefixed files under api/ as functions, so
        // shared modules like api/_lib/* must not be routable here either.
        const isPrivate = url.pathname.split("/").some((seg) => seg.startsWith("_"));

        if (isPrivate || rel.includes("..") || !existsSync(resolve(server.config.root, rel))) {
          res.statusCode = 404;
          res.setHeader("Content-Type", "application/json");
          return res.end(JSON.stringify({ error: `No API route for ${url.pathname}` }));
        }

        let mod;
        try {
          mod = await server.ssrLoadModule(`/${rel}`);
        } catch (err) {
          server.config.logger.error(`[api] failed to load ${rel}\n${err.stack ?? err}`);
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          return res.end(JSON.stringify({ error: "handler failed to load", detail: String(err) }));
        }

        if (typeof mod.default !== "function") {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          return res.end(JSON.stringify({ error: `${rel} has no default export` }));
        }

        const body =
          req.method === "GET" || req.method === "HEAD"
            ? undefined
            : await new Promise((ok, fail) => {
                const chunks = [];
                req.on("data", (c) => chunks.push(c));
                req.on("end", () => ok(Buffer.concat(chunks)));
                req.on("error", fail);
              });

        const request = new Request(url, {
          method: req.method,
          headers: req.headers,
          body,
          duplex: "half",
        });

        try {
          const out = await mod.default(request);
          res.statusCode = out.status;

          // Set-Cookie must not be flattened into one comma-joined header.
          for (const [k, v] of out.headers) {
            if (k.toLowerCase() !== "set-cookie") res.setHeader(k, v);
          }
          const cookies = out.headers.getSetCookie?.() ?? [];
          if (cookies.length) res.setHeader("Set-Cookie", cookies);

          res.end(out.body ? Buffer.from(await out.arrayBuffer()) : null);
        } catch (err) {
          server.config.logger.error(`[api] ${url.pathname} threw\n${err.stack ?? err}`);
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "handler threw", detail: String(err) }));
        }
      });
    },
  };
}
