#!/usr/bin/env node
/**
 * Les captures du MANIFESTE — celles qui décident de l'interface d'installation.
 *
 *   npm run screenshots
 *
 * POURQUOI. Sans `screenshots`, Chrome propose une installation minimale : une
 * ligne et un bouton. Avec, il ouvre une fiche qui montre l'application. C'est
 * la différence entre « voulez-vous installer ce site » et « voici ce que vous
 * installez », et `pwa-doctor` la relève comme une dette. Au relevé du
 * 02/09/2026, trois applications de la famille n'en avaient aucune.
 *
 * DEUX FORMATS, ET LES DEUX COMPTENT. `narrow` est exigé sur téléphone,
 * `wide` sur ordinateur ; n'en fournir qu'un fait retomber l'autre plateforme
 * sur l'interface minimale.
 *
 * Le script sert un BUILD, pas le serveur de développement : ce qu'on montre
 * doit être ce qui sera installé. Il démarre l'aperçu, capture, et s'arrête —
 * aucune étape à enchaîner à la main, donc rien à oublier.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
// Depuis `@playwright/test`, et non `playwright` : c'est le paquet que le
// dépôt déclare déjà pour ses e2e. En ajouter un second pour le même
// navigateur ferait deux versions à tenir d'accord.
import { chromium } from '@playwright/test';

const PORT = 4319;
const BASE = `http://localhost:${PORT}/`;
const OUT = 'public/screenshots';

/**
 * Les deux cadres. `narrow` est un 9/19.5 de téléphone ; `wide` un 16/9
 * d'ordinateur. Les tailles sont celles que Chrome attend pour ne PAS
 * recadrer : au-delà de 3840 px il refuse l'entrée en silence.
 */
const SHOTS = [
  { name: 'narrow', width: 540, height: 1170, path: '' },
  { name: 'wide', width: 1280, height: 720, path: 'reglages' },
];

/**
 * L'aperçu est lancé PAR NODE, sur le script de Vite — jamais par `npx`.
 *
 * Sous Windows, `npx` est un `.cmd`, et Node refuse depuis CVE-2024-27980 de
 * lancer un `.cmd` sans shell : `spawn` sort en `EINVAL`. Passer par un shell
 * rouvrirait la faille. Viser le fichier `.js` du paquet installé évite les
 * deux, et ne dépend d'aucun `PATH`.
 */
const viteBin = fileURLToPath(
  new URL('../node_modules/vite/bin/vite.js', import.meta.url)
);

const apercu = spawn(
  process.execPath,
  [viteBin, 'preview', '--port', String(PORT), '--strictPort', '--base', '/'],
  { stdio: 'ignore' }
);

const arreter = () => {
  apercu.kill();
};
process.on('exit', arreter);

try {
  // Laisser l'aperçu prendre le port. Une attente fixe suffit ici : le script
  // est lancé à la main, pas en CI, et un échec de connexion dira quoi faire.
  await sleep(2500);

  const navigateur = await chromium.launch();
  mkdirSync(OUT, { recursive: true });

  for (const shot of SHOTS) {
    const page = await navigateur.newPage({
      viewport: { width: shot.width, height: shot.height },
      // Langue et schéma FIXÉS : deux passages doivent rendre le même fichier,
      // sinon chaque exécution produit un diff Git illisible.
      locale: 'fr-FR',
      colorScheme: 'light',
      reducedMotion: 'reduce',
    });
    await page.goto(BASE + shot.path, { waitUntil: 'networkidle' });
    const png = await page.screenshot({ type: 'png' });
    const fichier = `${OUT}/${shot.name}.png`;
    writeFileSync(fichier, png);
    console.log(`✓ ${fichier} (${shot.width}×${shot.height})`);
    await page.close();
  }

  await navigateur.close();
  console.log(
    '\nDéclarées dans `vite.config.ts` — `pwaBaseOptions({ manifest: { screenshots } })`.'
  );
} finally {
  arreter();
}
