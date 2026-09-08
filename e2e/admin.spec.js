import { expect, test } from "@playwright/test";
import { OWNER_EMAIL, signIn, sql, unique } from "./helpers.js";

/**
 * The Phase 5 write path, driven through the real forms: create a client,
 * give someone access, create a project for them, post an update — then sign in
 * as that person and confirm they see exactly that project and nothing else.
 */
test("owner creates a client, contact, project and update; the client sees it", async ({
  page,
  browser,
}) => {
  const clientName = unique("Testworks");
  const projectName = unique("Portal");
  const contact = `${unique("nora")}@example.test`;

  await signIn(page, OWNER_EMAIL);
  await page.getByRole("button", { name: "Admin" }).click();
  await expect(page).toHaveURL("/admin");

  // --- client + contact -----------------------------------------------------
  await page.getByRole("tab", { name: "Clients" }).click();
  await page.getByLabel("Client name").fill(clientName);
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByRole("status")).toContainText("Client created");

  await page.getByLabel("Client", { exact: true }).selectOption({ label: clientName });
  await page.getByLabel("Email").fill(contact);
  await page.getByRole("button", { name: "Give access" }).click();
  await expect(page.getByRole("status")).toContainText("Access granted");

  // --- project --------------------------------------------------------------
  await page.getByRole("tab", { name: "Projects" }).click();
  await page.getByRole("button", { name: "Add a project" }).click();
  await page.getByLabel("Client", { exact: true }).selectOption({ label: clientName });
  await page.getByLabel("Name").fill(projectName);
  await page.getByLabel("Summary").fill("The thing they are waiting on");
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page.getByRole("status")).toContainText("Project created");

  // --- update, moving the status in the same write --------------------------
  await page.getByRole("tab", { name: "Updates" }).click();
  await page.getByLabel("Project").selectOption({ label: `${clientName} — ${projectName}` });
  await page.getByLabel("Update").fill("Staging is up for you to look at.");
  await page.getByLabel("Also move status to").selectOption("review");
  await page.getByRole("button", { name: "Post update" }).click();
  await expect(page.getByRole("status")).toContainText("Update posted");

  // Both halves of the CTE landed.
  const [row] = await sql`
    SELECT u.status_at_time, p.status FROM updates u
      JOIN projects p ON p.id = u.project_id
     WHERE p.name = ${projectName}`;
  expect(row.status).toBe("review");
  expect(row.status_at_time).toBe("review");

  // --- the client's view ----------------------------------------------------
  const clientCtx = await browser.newContext();
  const clientPage = await clientCtx.newPage();
  await signIn(clientPage, contact);

  const cards = clientPage.locator("[data-testid=project-card]");
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText(projectName);
  await expect(cards.first()).toContainText("Staging is up for you to look at.");

  // No admin affordance, and the route itself does not render one.
  await expect(clientPage.getByRole("button", { name: "Admin" })).toHaveCount(0);
  await clientPage.goto("/admin");
  await expect(clientPage.getByRole("tab", { name: "Clients" })).toHaveCount(0);
  await expect(cards.first()).toBeVisible();

  // And the endpoint refuses it regardless of what the browser rendered.
  const res = await clientPage.request.post("/api/admin", {
    data: { action: "client.create", name: "should not exist" },
  });
  expect(res.status()).toBe(403);

  await clientCtx.close();
});

test("constraint failures surface as messages, not crashes", async ({ page }) => {
  await signIn(page, OWNER_EMAIL);
  await page.goto("/admin");

  const res = await page.request.post("/api/admin", {
    data: {
      action: "project.links.set",
      projectId: "00000000-0000-0000-0000-000000000000",
      links: [{ kind: "live", url: "http://insecure.test" }],
    },
  });
  expect(res.status()).toBe(400);
  expect((await res.json()).message).toMatch(/https/i);
});
