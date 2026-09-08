import { expect, test } from "@playwright/test";

/**
 * The anonymous entry point. Worth a live test because it is the only screen a
 * client sees before they have a session, and because Field associates its
 * label by id — a regression there is invisible in a build but breaks the form
 * for anyone using a screen reader.
 */
test("an unknown address gets the same confirmation as a known one", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/");

  const email = page.getByLabel("Email");
  await expect(email).toBeVisible();
  await email.fill("definitely-not-a-user@example.test");
  await page.getByRole("button", { name: /send|sign in|link/i }).click();

  // The response must not reveal that no such account exists.
  await expect(page.getByText(/check your (inbox|email)|sent/i)).toBeVisible();
  await expect(page.getByText(/no such|unknown|not found/i)).toHaveCount(0);
});
