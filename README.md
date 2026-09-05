# pwa-starter-kit

Le **squelette** des applications PWA de la famille `miss-*` / `mister-*` : la
composition que chaque application réécrivait, assemblée une fois sur
[`@mister-guiiug/dev-pwa-config`](https://github.com/mister-guiiug/dev-pwa-config)
et prête à cloner.

Il n'a pas de métier. Il a le **cadre** — et les décisions qui vont avec.

## Pourquoi il existe

Le socle est une bibliothèque : il donne des composants, des configurations et
des workflows. Ce qu'il ne peut pas donner, c'est la **composition** — `main.tsx`,
le routeur, la pile de fournisseurs, l'écran de réglages, le choix du backend.
Ce code-là ne se factorise pas dans un paquet agnostique, alors il est réécrit
à chaque naissance.

Mesuré sur les dix-sept applications du parc : **cette coquille pèse 22 % des
lignes, soit environ 52 000**. Et elle dérive — dix-sept `vitest.config.ts`
différents pour dix-sept applications, dix-sept `index.html`. Les composants
promus pour l'absorber ne sont pas adoptés après coup : la couche
d'authentification livrée le 02/09/2026 comptait dix copies dans cinq
applications, et **zéro migration**.

Une composition se donne à la naissance, ou jamais. C'est ce que fait ce dépôt.

## Démarrer

```bash
npm install
```

```bash
npm run dev
```

L'installation lit le socle sur GitHub Packages : exporter `NODE_AUTH_TOKEN`
(un jeton avec `read:packages`) avant `npm install`.

**L'application démarre sans aucune configuration.** C'est une propriété à
conserver : elle rend possibles le hors-ligne, les tests sans secrets, et la
page publique qu'on ouvre sans compte.

## Vérifier

| Commande              | Ce qu'elle vérifie                                          |
| --------------------- | ----------------------------------------------------------- |
| `npm run lint`        | ESLint du socle (react-hooks, jsx-a11y, react-refresh)      |
| `npm run type-check`  | TypeScript strict, `tsc -b`                                 |
| `npm test`            | Vitest — le magasin, du geste jusqu'au stockage relu        |
| `npm run test:e2e`    | Playwright — le cadre, sur un **build de production**       |
| `npm run build`       | `tsc -b`, Vite, budget de poids, puis `pwa-doctor --strict` |
| `npm run doctor`      | La conformité au parc, sans faire échouer                   |
| `npm run screenshots` | Régénère les captures du manifeste                          |

`npm run build` échoue si le poids dépasse le budget **ou** si `pwa-doctor`
trouve la moindre dette. C'est délibéré : ce dépôt est la définition exécutable
de « conforme au parc », il doit passer sa propre porte.

## Ce qu'il démontre

Chaque pièce est là parce que son absence a coûté quelque chose de mesuré :

- **`pwaBaseOptions({ id })`** engendre le manifeste au lieu de le recopier.
  Ce module du socle n'avait **aucun importateur**, et les manifestes écrits à
  la main portaient `lang: en` sur trois applications françaises, pas d'`id`
  six fois, pas de `maskable` trois fois ;
- **`spaFallbackPlugin()`** évite la page 404 de GitHub sur un lien profond —
  quatre applications en souffraient ;
- **le magasin versionné** met la donnée de côté avant toute perte possible,
  ce qu'aucun des sept `storage.ts` maison ne faisait ;
- **le sélecteur de backend** retombe sur le local et le **dit** dans l'écran
  de réglages ;
- **`components.css`** est importé : sans lui, les composants du socle sont
  nus, ça compile, les tests passent, et l'écran est cassé.

## Les décisions

Elles sont écrites, avec leur contexte mesuré et ce qu'elles écartent :
[`docs/adr/`](./docs/adr/README.md).

Un gabarit donne des fichiers ; un squelette donne des décisions déjà prises.
C'est la seule différence qui compte.

## Partir de là

1. cloner ou utiliser ce dépôt comme modèle ;
2. remplacer `pwa-starter-kit` par l'identifiant du nouveau dépôt — il est
   déclaré **une fois**, dans `src/app/links.ts` et `vite.config.ts` ;
3. régénérer les icônes (`npm run icons`) depuis un nouveau `favicon.svg` ;
4. supprimer la fonctionnalité d'exemple (`src/features/home/`) — elle est
   faite pour ça ;
5. inscrire l'application au catalogue du socle, sans quoi elle n'apparaît chez
   ses sœurs ni ne reçoit la protection de branche.

Ces gestes seront un jour ceux d'un générateur (`create-lg-pwa-app`, chantier 4
de la feuille de route). En attendant, ils sont courts et écrits.

## Licence

MIT — voir [LICENSE](./LICENSE).
