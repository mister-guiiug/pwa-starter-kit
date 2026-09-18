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
   * LE VOLET « MESURE » EST DÉSARMÉ POUR UN TEMPS, ET CE N'EST PAS UN OUBLI.
   *
   * Le parc quitte GA4 pour PostHog en Europe (ADR 0012). La prop de
   * `ConsentBanner` change de nom — `gaMeasurementId` devient `posthogKey` —
   * et ce dépôt est compilé CONTRE DEUX VERSIONS du socle : la publiée, par sa
   * propre CI, et celle de la branche, par le job « Le squelette, construit sur
   * ce paquet ». Tant que la 6.0.0 n'est pas sortie, aucun des deux noms ne
   * passe les deux. `App.tsx` ne passe donc AUCUN identifiant, et sans
   * identifiant le bandeau ne rend rien — par décision, pas par panne.
   *
   * Ce que la spec continue de tenir pendant l'intervalle : le service worker,
   * et donc la PLACE de ce qui se monte à l'entrée. C'est la moitié qui a
   * réellement cassé trois fois.
   *
   * À RÉARMER dès la 6.0.0 publiée, en même temps que la prop revient.
   */
  test('la question est posée, une vue part, le service worker s’enregistre', async ({
    page,
  }) => {
    await expectEcranEntreeCable(page, expect, {
      url: '/pwa-starter-kit/',
      consentement: false,
      vueDePage: false,
    });
  });
});
