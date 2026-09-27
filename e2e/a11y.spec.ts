// Template de suite a11y minimale (axe-core + Playwright).
// Cible : <projet>/e2e/a11y.spec.ts
// Prérequis : npm i -D @axe-core/playwright
//
// Le tag @a11y permet de filtrer en CI : `playwright test --grep @a11y`.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { expectNoA11yViolations } from '@mister-guiiug/dev-pwa-config/playwright-a11y';

test.describe('@a11y accessibilité', () => {
  test("page d'accueil sans violation WCAG A/AA", async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-dwc="app-shell-skip"]')).toBeAttached();
    await expect(page.locator('main#contenu')).toBeVisible();
    await expectNoA11yViolations(page, AxeBuilder, expect);
  });

  test('À propos : coquille + FamilyAbout sans violation', async ({ page }) => {
    await page.goto('/a-propos');
    await expect(page.locator('[data-dwc="family-about"]')).toBeVisible();
    await expect(page.locator('[data-dwc="app-footer"]')).toBeVisible();
    await expectNoA11yViolations(page, AxeBuilder, expect);
  });
});
