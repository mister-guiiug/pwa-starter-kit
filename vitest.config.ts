import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { baseTestOptions } from '@mister-guiiug/dev-pwa-config/vitest-base';

export default defineConfig({
  plugins: [react()],
  test: {
    ...baseTestOptions,
    // Les specs Playwright vivent dans `e2e/` : Vitest ne doit pas y piocher.
    exclude: ['**/node_modules/**', '**/e2e/**'],
    // Vitest stube les feuilles : `import … from './index.css?raw'` rendrait
    // la chaîne VIDE, et `src/palette.test.ts` ne mesurerait rien. On n'ouvre
    // que la lecture BRUTE de cette feuille ; un `import './index.css'` reste
    // stubé, et Tailwind n'est jamais compilé pendant les tests (même réglage
    // que mister-footcoach).
    css: { include: [/index\.css\?raw$/] },
  },
});
