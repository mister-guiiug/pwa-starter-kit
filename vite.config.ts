import { defineConfig, type PluginOption } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';
import { pwaBaseOptions } from '@mister-guiiug/dev-pwa-config/vite-pwa';
import {
  pwaSeoPlugin,
  spaFallbackPlugin,
} from '@mister-guiiug/dev-pwa-config/vite-pwa-base';
import { cspPlugin } from '@mister-guiiug/dev-pwa-config/vite-csp';
import { versionPlugin } from '@mister-guiiug/dev-pwa-config/vite-version';

/**
 * LE MANIFESTE NE S'ÉCRIT PAS À LA MAIN.
 *
 * `pwaBaseOptions({ id })` engendre le manifeste complet — `id`, `lang`, scope,
 * `start_url`, icônes `any` ET `maskable`, couleurs lues dans la palette de
 * l'app — et les options Workbox qui vont avec. C'est le module que le socle
 * publie depuis longtemps et que **zéro application n'importait** : les vingt
 * `vite.config.ts` du parc font de 83 à 380 lignes, dont une centaine à
 * recopier ce que cette fonction rend. Les défauts qui en découlaient se
 * mesuraient en production le 02/09/2026 : `lang: en` sur trois apps
 * françaises, `id` absent six fois, `maskable` absent trois fois.
 *
 * Ce fichier est court exprès. Tout ce qui n'y est pas est une décision que le
 * socle a déjà prise, et qu'une app n'a pas à reprendre.
 */
const analyze = process.env.ANALYZE === '1';
const APP_ID = 'pwa-starter-kit';

export default defineConfig(({ command }) => {
  // `VITE_BASE_PATH` est prioritaire : le déploiement famille le pose, et la
  // CI Lighthouse le met à `/` pour servir le build à la racine. Sans cette
  // priorité, l'audit part sur un chemin qui n'existe pas et rend NO_FCP.
  let basePath = '/';
  if (process.env.VITE_BASE_PATH) {
    basePath = process.env.VITE_BASE_PATH;
  } else if (command === 'build') {
    basePath = `/${APP_ID}/`;
  }

  return {
    base: basePath,
    build: { sourcemap: true },
    plugins: [
      react(),
      tailwindcss(),

      // AVANT `cspPlugin` : il pose un script inline dans le `<head>`, que la
      // CSP doit hacher après coup.
      versionPlugin({ manifest: true }),

      pwaSeoPlugin({
        basePath,
        logoPath: '/icon-512.png',
        themeColor: { light: '#f7f8fa', dark: '#0f1115' },
      }),

      // `frame-ancestors` est volontairement absent : la spécification
      // l'ignore dans une balise `<meta>`, et GitHub Pages ne pose aucun
      // en-tête. Le greffon refuse la directive plutôt que d'en donner
      // l'illusion.
      cspPlugin({ dev: command === 'serve' }),

      // Repli SPA : sans `404.html`, rafraîchir un lien profond sert la page
      // d'erreur de GitHub. Quatre apps en souffraient en production.
      spaFallbackPlugin(),

      VitePWA(
        pwaBaseOptions({
          id: APP_ID,

          // COULEURS DONNÉES EXPLICITEMENT. `pwaBaseOptions` sait les lire dans
          // `themes.js` du socle, mais seulement pour une app INSCRITE au
          // catalogue de la famille. Une app neuve n'y est pas encore : sans
          // ces deux lignes, le manifeste sort sans `theme_color`, et
          // `vite-plugin-pwa` avertit que l'application « ne pourra pas être
          // installée ». L'avertissement passe dans le bruit du build.
          themeColor: '#3b6ea5',
          backgroundColor: '#f7f8fa',
          // Les captures décident de l'interface d'INSTALLATION : sans elles,
          // Chrome propose une ligne et un bouton au lieu d'une fiche. Les
          // deux formats sont requis — `narrow` sur téléphone, `wide` sur
          // ordinateur — et se régénèrent par `npm run screenshots`.
          manifest: {
            screenshots: [
              {
                src: 'screenshots/narrow.png',
                sizes: '540x1170',
                type: 'image/png',
                form_factor: 'narrow',
                label: "L'écran d'accueil",
              },
              {
                src: 'screenshots/wide.png',
                sizes: '1280x720',
                type: 'image/png',
                form_factor: 'wide',
                label: 'Les réglages',
              },
            ],
          },
        })
      ),

      ...(analyze
        ? [
            visualizer({
              filename: 'dist/stats.html',
              gzipSize: true,
              brotliSize: true,
              open: !process.env.CI,
            }) as PluginOption,
          ]
        : []),
    ],
  };
});
