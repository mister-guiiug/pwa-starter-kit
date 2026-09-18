import { test, expect } from '@playwright/test';
import { expectEcranEntreeCable } from '@mister-guiiug/dev-pwa-config/playwright-entree';

/*
 * L'ÉCRAN D'ENTRÉE, VÉRIFIÉ LÀ OÙ IL CASSE.
 *
 * Trois fois en un mois, une pièce à effet de bord s'est retrouvée montée
 * DERRIÈRE la porte d'une app du parc : `registerSW` d'abord — donc aucun
 * service worker et rien en cache —, le bandeau de consentement ensuite — donc
 * la question jamais posée —, la vue de page enfin — donc aucune remontée.
 *
 * À chaque fois le composant était bien écrit, les tests unitaires verts, la CI
 * verte, et le défaut trouvé EN PRODUCTION. Cette spec ne teste pas un
 * composant, elle teste une PLACE.
 */
test.describe('@critical écran d’entrée', () => {
  /*
   * RÉARMÉ LE 19/09/2026, la 6.0.0 du socle étant publiée.
   *
   * Le volet « mesure » avait été désarmé le temps de la bascule vers PostHog
   * (ADR 0012) : la prop de `ConsentBanner` changeait de nom, et ce dépôt est
   * compilé CONTRE DEUX VERSIONS du socle — la publiée, par sa propre CI, et
   * celle de la branche, par le job « Le squelette, construit sur ce paquet ».
   * Entre les deux, aucun nom ne passait les deux. Il en passe un maintenant.
   *
   * CE QUE LA VUE DE PAGE PROUVE ICI n'est plus ce qu'elle prouvait du temps de
   * GA4. `litVuesDePage` lisait `window.dataLayer`, que gtag remplissait de
   * lui-même : la garde était verte même quand le script distant ne chargeait
   * pas. Elle lit désormais `window.__DWC_MESURE`, que le socle n'écrit
   * qu'APRÈS avoir réellement remis l'événement au client PostHog — donc après
   * que le `loader` d'`App.tsx` a résolu `posthog-js`. Un `loader` oublié
   * ferait tomber cette ligne, là où l'ancienne l'aurait laissée passer.
   */
  test('la question est posée, une vue part, le service worker s’enregistre', async ({
    page,
  }) => {
    await expectEcranEntreeCable(page, expect, {
      url: '/pwa-starter-kit/',
    });
  });
});
