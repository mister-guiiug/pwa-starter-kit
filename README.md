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

Le serveur de développement écoute sur le port **5240**, celui que le catalogue
du socle réserve au squelette : `devPortOf(APP_ID, 5240)` dans `vite.config.ts`,
repris par `.claude/launch.json` pour l'aperçu du poste. Une application
engendrée reçoit à sa naissance un port libre du même catalogue.

**L'application démarre sans aucune configuration.** C'est une propriété à
conserver : elle rend possibles le hors-ligne, les tests sans secrets, et la
page publique qu'on ouvre sans compte.

## Vérifier

| Commande              | Ce qu'elle vérifie                                                            |
| --------------------- | ----------------------------------------------------------------------------- |
| `npm run lint`        | ESLint du socle (react-hooks, jsx-a11y, react-refresh)                        |
| `npm run type-check`  | TypeScript strict, `tsc -b`                                                   |
| `npm test`            | Vitest — le magasin, du geste jusqu'au stockage relu                          |
| `npm run test:e2e`    | Playwright — le cadre, sur un **build de production**                         |
| `npm run build`       | `tsc -b`, Vite, budget de poids, puis `pwa-doctor --strict`                   |
| `npm run doctor`      | La conformité au parc, sans faire échouer                                     |
| `npm run screenshots` | Régénère les captures du manifeste — `pwa-screenshots` du socle, sur un build |

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
  nus, ça compile, les tests passent, et l'écran est cassé ;
- **la barre basse est collée par `placement="fixed"`** et le contenu réservé
  par `reserve="bottom-nav"` : huit dépôts recopiaient la même règle CSS, et
  chaque copie pouvait diverger sur la zone sûre iOS ;
- **les captures du manifeste sont lues dans `public/screenshots`** et les
  couleurs dans `src/index.css` : `vite.config.ts` ne les recopie plus, et
  `npm run screenshots` les régénère depuis un build.
- **le port des notes parle en mutations** (`add`, `remove`, `import`) : le
  premier adaptateur Supabase effaçait toutes les lignes et réinsérait la
  liste à chaque note ajoutée — son propre commentaire annonçait la limite ;
- **les réglages importent** ce qu'ils exportent, par
  `versioned-store.import()` : le fichier passe par le schéma, un fichier
  d'une autre app est refusé sans rien effacer, et des notes existantes
  demandent confirmation avant d'être remplacées. C'est le seul moyen de
  changer d'appareil sans compte, et presque aucune app du parc ne l'offrait ;
- **« Signaler un problème »** dans le pied de page (`AppFooter issues`) :
  le gabarit `bug.yml` du compte, prérempli avec la version, le commit,
  l'écran et le navigateur — ce qu'un rapport n'a jamais après coup. Le pied
  de page est rendu **sur l'accueil et sur « À propos », nulle part ailleurs**
  — la règle famille du 06/09/2026, que `pwa-doctor` vérifie ; dans la
  coquille, il suivait chaque écran ;
- **la fiche d'installation** (`PwaInstallPrompt`) apparaît dans « À propos »
  quand le navigateur le permet, et seulement alors ;
- **supprimer une note s'annule** au lieu de se confirmer : la note quitte
  l'écran tout de suite, la base ne l'apprend qu'après huit secondes, et
  « Annuler » la remet **à sa place**. `ConfirmDialog` du socle est adopté par
  quatorze applications, `useUndoableState` par zéro, et **aucune** n'offrait
  d'annulation après suppression d'un enregistrement — cf.
  [ADR 0008](./docs/adr/0008-annuler-plutot-que-confirmer.md) ;
- **on peut supprimer son compte**, et la base le prouve. Dix applications du
  parc ont des comptes, **deux** offraient une voie d'effacement. La carte
  « Zone dangereuse » demande de **retaper son adresse** — pas un « OK », qui
  est le même clic que celui qu'on regrette — et n'existe pas en mode local.
  Surtout : qu'une fonction `security definer` puisse effacer dans `auth.users`
  était **documenté et jamais prouvé** sur ce parc ; dix-huit assertions pgTAP
  le figent, mécanisme compris — cf.
  [ADR 0009](./docs/adr/0009-supprimer-son-compte.md) ;
- **on écrit hors ligne**, et ce qui attend le **dit**. La file du socle
  (`sync-queue`) enveloppe le port distant : une note écrite sans réseau est
  retenue puis rejouée, une écriture refusée par la RLS part en lettre morte au
  premier essai au lieu de boucler, et `SyncStatusBadge` porte l'état. Le
  branchement d'un port sur cette file avait été écrit trois fois dans le parc
  et jamais dans le squelette — cf.
  [ADR 0010](./docs/adr/0010-ecrire-hors-ligne.md).

## Supabase : une variante, pas un fork

Le backend distant n'est **pas** une branche séparée. C'est un adaptateur qui
s'active quand `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` sont présentes,
et l'application reste entière sans elles. Un fork aurait deux CI, deux
historiques, et divergerait en quelques semaines.

Ce que la variante apporte, tout est déjà là :

| Pièce                                | Ce qu'elle règle                                                                                                                   |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `supabase/migrations/0001…0005`      | `profiles`, rôles, RLS **deny-by-default** avec double verrou, le hook qui recopie le rôle dans le jeton, et `delete_my_account()` |
| `supabase/tests/*.test.sql`          | trente et une assertions pgTAP : deux comptes ne se voient pas, le rôle arrive dans le jeton, un compte s'efface vraiment          |
| `supabase/config.toml`               | la pile locale, pour jouer migrations et tests depuis zéro (`pwa-supabase-test.yml`)                                               |
| `src/backend/supabase.ts`            | l'adaptateur du seul port `notes` — les autres restent locaux ; `flowType: 'pkce'`                                                 |
| `src/backend/queued-notes.ts`        | la file d'écritures hors ligne (`sync-queue` du socle) enveloppant ce port ; rien en mode local                                    |
| `src/auth/`, `src/features/account/` | le fournisseur, le formulaire — lien d'abord, mot de passe en option — et `useRole()`                                              |
| `.github/workflows/supabase-*.yml`   | tests pgTAP sur une pile jetable, migrations, et le keep-alive anti-pause du plan Free                                             |

Pour l'activer : poser les deux variables dans **`vars`** du dépôt (jamais dans
`secrets` — Vite les copie dans le bundle), la référence du projet en variable
aussi (`SUPABASE_PROJECT_ID` : elle est dans l'URL), deux secrets pour les
migrations (`SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD` — par le
propriétaire), puis appliquer `supabase/keep-alive.sql`. Sans la table
`keep_alive`, le ping du keep-alive répond 404 **en silence**, et le projet
s'endort quand même. La procédure complète, geste par geste et avec ses
variantes, est dans
[PARAMETRAGE.md](https://github.com/mister-guiiug/dev-pwa-config/blob/main/PARAMETRAGE.md)
du socle.

Deux réglages de plus, côté projet Supabase, que ni une migration ni un
workflow ne peuvent poser — et dont l'absence ne fait aucun bruit :

- **activer le hook « Custom Access Token »** (Authentication → Hooks, ou
  l'API de gestion : `hook_custom_access_token_uri` =
  `pg-functions://postgres/public/custom_access_token_hook`). Sans lui, le
  jeton ne porte aucun rôle et `useRole()` ne voit jamais un administrateur ;
- **autoriser l'adresse de l'application comme retour de lien** (`site_url`
  et la liste d'URL autorisées). À la création, un projet n'autorise que
  `http://localhost:3000` : le lien de connexion part, l'utilisateur clique,
  et n'arrive nulle part.

## Les décisions

Elles sont écrites, avec leur contexte mesuré et ce qu'elles écartent :
[`docs/adr/`](./docs/adr/README.md).

Un gabarit donne des fichiers ; un squelette donne des décisions déjà prises.
C'est la seule différence qui compte.

## Partir de là

**Ne clonez pas ce dépôt** — appelez le générateur, qui en tire une archive et
la met à votre nom :

```bash
npx github:mister-guiiug/create-lg-pwa-app miss-exemple --publish
```

[`create-lg-pwa-app`](https://github.com/mister-guiiug/create-lg-pwa-app)
substitue l'identité partout, écrit le lockfile avec **npm 10** — celle du
runner, sans quoi la CI rougit au premier push —, fait le premier commit, crée
le dépôt public et active Pages **par un PUT**, seule forme qui empêche Jekyll
de republier le README à la place de l'application.

Restent quatre gestes, que le générateur imprime et ne fait pas :

1. `node scripts/apply-rulesets.mjs <id>` depuis le socle, pour protéger la
   branche ;
2. inscrire l'application au catalogue du socle par une PR, sans quoi elle
   n'apparaît pas chez ses sœurs ;
3. régénérer les icônes (`npm run icons`) depuis un nouveau `favicon.svg` ;
4. supprimer la fonctionnalité d'exemple (`src/features/home/`) — elle est
   faite pour ça.

À la main, la substitution reste courte : `pwa-starter-kit` n'est déclaré
qu'**une fois**, dans `src/app/links.ts` et `vite.config.ts`.

## Licence

MIT — voir [LICENSE](./LICENSE).
