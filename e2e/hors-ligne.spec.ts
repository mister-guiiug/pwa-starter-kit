import { expect, test } from '@playwright/test';

/**
 * LA BUILD SE RECHARGE HORS LIGNE — l'essai que l'audit du 05/11/2026 a fait
 * à la main sur les vingt-trois applications publiées, et qu'aucun test du
 * parc ne faisait.
 *
 * Trois applications ne démarraient plus du tout hors ligne : leur entrée
 * importait un morceau exclu du précache, qui contenait React. Leur code était
 * pensé pour le hors-ligne, leurs tests verts, leur CI verte — et seul le
 * texte statique de la page restait à l'écran. Le seul moyen de le voir, c'est
 * de faire ce que fait l'utilisateur : ouvrir l'application une fois, perdre
 * le réseau, la rouvrir.
 *
 * LA COUPURE EST DOUBLE, et c'est le point. `setOffline` fait mentir
 * `navigator.onLine` et émet `offline` ; il ne coupe pas forcément ce que le
 * service worker va chercher. `context.route` refuse en plus TOUTE requête,
 * celles du worker comprises — ce qui ne vient pas du précache n'arrive pas.
 *
 * SUR LA BUILD DE PRODUCTION (`preview: true` dans `playwright.config.ts`),
 * service worker AUTORISÉ — le défaut de Playwright, que la configuration ne
 * touche pas. Le test vérifie quand même qu'un worker contrôle la page avant
 * de couper : sans lui, il ne prouverait rien.
 *
 * EN MODE LOCAL, comme toute la suite : la donnée relue est celle du magasin
 * versionné. La copie de lecture du mode Supabase (ADR 0013) est prouvée au
 * niveau du port, dans `src/backend/cached-notes.test.ts`.
 */
test.describe('@critical hors ligne', () => {
  test('rouverte sans réseau, l’application démarre et relit ses notes', async ({
    page,
    context,
    browserName,
  }) => {
    // Seul Chromium laisse `context.route` intercepter les requêtes d'un
    // service worker : ailleurs, la coupure serait partielle et le test
    // pourrait passer pour de mauvaises raisons. La CI de la famille joue
    // Chromium.
    test.skip(
      browserName !== 'chromium',
      'la coupure des requêtes du service worker n’existe que sous Chromium'
    );

    // 1. La visite en ligne : une note, et le worker installé.
    await page.goto('/');
    const texte = `relue hors ligne ${Date.now()}`;
    await page.getByLabel('Nouvelle note').fill(texte);
    await page.getByRole('button', { name: 'Ajouter' }).click();
    await expect(page.getByText(texte)).toBeVisible();

    // `ready` se résout quand le worker est ACTIF, donc après la fin du
    // précache. Le rechargement le fait contrôler la page.
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    await expect
      .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), {
        message: 'un service worker doit contrôler la page avant la coupure',
      })
      .toBe(true);

    // 2. La coupure, double.
    await context.setOffline(true);
    await context.route('**/*', route => route.abort('internetdisconnected'));

    // 3. Rouvrir. Un morceau manquant au précache ferait échouer ici.
    await page.reload();

    // ANCRÉ SUR CE QUE SEUL REACT REND. Le titre `h1` est aussi dans le HTML
    // servi (`pwaSeoPlugin`) : il resterait visible sur une application morte.
    // La note, elle, ne sort que du magasin, par le rendu de React.
    await expect(page.getByText(texte)).toBeVisible();
    await expect(page.getByLabel('Nouvelle note')).toBeEditable();
    // Et l'application SAIT qu'elle est hors ligne.
    await expect(page.locator('[data-dwc="connection-banner"]')).toBeVisible({
      timeout: 10_000,
    });
  });
});
