/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />
/// <reference types="@mister-guiiug/dev-pwa-config/vite-version" />

interface ImportMetaEnv {
  /**
   * Clé de projet PostHog (`phc_…`), nuage EUROPÉEN — ADR 0012.
   *
   * LA MÊME POUR TOUT LE PARC, et c'est délibéré : un seul projet, les
   * applications distinguées dedans par la super-propriété `app_name` que le
   * socle déduit du chemin de base. L'inverse — un projet par dépôt — rendait
   * le total illisible, et c'est la décision que l'ADR 0011 avait déjà prise
   * du temps de GA4.
   *
   * ELLE EST PUBLIQUE par conception : elle part dans le bundle servi par
   * GitHub Pages. D'où `vars` et non `secrets` — une clé de projet (`phc_`)
   * n'est pas une clé personnelle (`phx_`), qui elle ne doit jamais approcher
   * un dépôt.
   *
   * Absente, `ConsentBanner` ne rend rien et rien n'est mesuré — l'app part
   * donc muette, et poser la variable est le seul geste qui l'allume.
   */
  readonly VITE_POSTHOG_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
