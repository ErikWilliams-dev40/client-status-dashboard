import { expect, test } from "@playwright/test";
import { OWNER_EMAIL, signIn } from "./helpers.js";

/**
 * The two behaviors Phase 4 reasoned about but never exercised in a browser:
 * popstate navigation, and the stopPropagation on a card's link buttons.
 */
test.describe("client read path", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, OWNER_EMAIL);
  });

  test("back button returns to the dashboard (popstate)", async ({ page }) => {
    const card = page.locator("[data-testid=project-card]").first();
    const name = await card.locator("[data-testid=project-name]").innerText();

    await card.click();
    await expect(page).toHaveURL(/\/p\//);
    await expect(page.locator("h1")).toContainText(name);

    await page.goBack();

    // The assertion that matters: useRoute's popstate listener has to re-render
    // the dashboard. Without it the URL changes and the view does not.
    await expect(page).toHaveURL("/");
    await expect(page.locator("[data-testid=project-card]").first()).toBeVisible();
  });

  test("clicking a card's link button does not open the project", async ({ page }) => {
    const card = page
      .locator("[data-testid=project-card]")
      .filter({ has: page.locator("[data-testid=card-link]") })
      .first();

    const link = card.locator("[data-testid=card-link]").first();
    await expect(link).toHaveAttribute("target", "_blank");

    // target=_blank would open a tab and leave this page's URL alone either
    // way, so intercept the click instead and assert on where we did *not* go.
    await link.evaluate((el) => el.removeAttribute("target"));
    await link.click();

    await expect(page).not.toHaveURL(/\/p\//);
  });

  test("an unknown project id renders the not-found state", async ({ page }) => {
    await page.goto("/p/00000000-0000-0000-0000-000000000000");
    await expect(page.getByText(/couldn.t find|not found/i)).toBeVisible();
  });
});
