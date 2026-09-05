import { expect, test } from '@playwright/test';

/**
 * Le SMOKE : ce qui doit marcher pour qu'une livraison ait un sens.
 *
 * Le tag `@critical` est celui que la CI de la famille exécute
 * (`playwright test --grep @critical`) : une spec sans lui n'est PAS jouée en
 * intégration continue, et le workflow rapporte « No tests found » sans
 * échouer. C'est une panne silencieuse que le parc a déjà connue.
 *
 * Ces tests passent sur un BUILD de production, service worker compris.
 */
test.describe('@critical le cadre', () => {
  test("l'accueil s'ouvre et porte un titre", async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Notes');
  });

  test('une note ajoutée survit au rechargement', async ({ page }) => {
    await page.goto('/');

    const texte = `note de test ${Date.now()}`;
    await page.getByLabel('Nouvelle note').fill(texte);
    await page.getByRole('button', { name: 'Ajouter' }).click();
    await expect(page.getByText(texte)).toBeVisible();

    // Le vrai contrat de la persistance : ce qui est écrit se relit après un
    // démarrage à froid, pas seulement dans l'état vivant du magasin.
    await page.reload();
    await expect(page.getByText(texte)).toBeVisible();
  });

  test('la navigation atteint les trois destinations', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('link', { name: 'Réglages' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Réglages'
    );

    await page.getByRole('link', { name: 'À propos' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'À propos'
    );
  });

  test('un lien profond rafraîchi sert l’app, pas la page d’erreur', async ({
    page,
  }) => {
    // Le repli SPA de `spaFallbackPlugin` : sans lui, GitHub Pages sert sa
    // propre page « File not found » sur un lien partagé ouvert à froid.
    // Quatre applications de la famille en souffraient en production.
    await page.goto('/reglages');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Réglages'
    );
  });

  test('la langue bascule, et le cadre suit', async ({ page }) => {
    await page.goto('/reglages');

    // `SegmentedControl` du socle expose un `tablist`, pas un groupe de
    // boutons radio : le rôle se lit dans le rendu, il ne se devine pas.
    await page.getByRole('tab', { name: 'EN' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Settings'
    );
    // `LabelsProvider` est posé par le fournisseur i18n : les libellés des
    // composants du socle suivent sans que l'app ait rien à câbler.
    await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();
  });
});
