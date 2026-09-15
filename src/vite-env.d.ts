/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />
/// <reference types="@mister-guiiug/dev-pwa-config/vite-version" />

interface ImportMetaEnv {
  /**
   * Identifiant de mesure GA4 (`G-…`), propre à CHAQUE application engendrée.
   *
   * Une propriété par site, jamais partagée : c'est ce qui rend le suivi
   * indépendant. Deux applications sous le même identifiant mélangeraient
   * leurs audiences sans qu'aucun rapport ne le signale.
   *
   * Absente, `ConsentBanner` ne rend rien et rien n'est mesuré — l'app part
   * donc muette, et poser la variable (en `vars`, pas en `secrets`) est le
   * seul geste qui l'allume.
   */
  readonly VITE_GA_MEASUREMENT_ID?: string;
  /** Conteneur GTM (`GTM-…`), si l'app préfère GTM à GA4 direct. */
  readonly VITE_GTM_CONTAINER_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
