---
title: Créer une PWA avec React et Vite : les étapes et un squelette
description: Créer une PWA avec React et Vite : manifeste, service worker, icônes, mises à jour, routage et déploiement, pas à pas. Et un squelette libre pour démarrer.
---

# Créer une PWA avec React et Vite

Une application web progressive (PWA) s'installe sur l'écran d'accueil, s'ouvre dans sa propre fenêtre et peut démarrer sans réseau. Avec React et Vite, la base est rapide à poser. Ce qui en fait une PWA tient en trois briques, et quelques décisions qu'il vaut mieux prendre tôt.

## Les trois briques d'une PWA

- **Le manifeste** : un fichier JSON qui donne le nom de l'application, ses icônes, ses couleurs, son adresse de départ et son mode d'affichage (`standalone` pour une fenêtre sans barre d'adresse).
- **Le service worker** : un script qui met les fichiers de l'application en cache pour qu'elle démarre hors ligne, et qui gère l'arrivée des nouvelles versions.
- **HTTPS** : les service workers ne fonctionnent que dans un contexte sécurisé. En développement, `localhost` compte comme tel.

## Étape par étape

1. **Créez le projet.** `npm create vite@latest mon-app -- --template react-ts` pose une application React en TypeScript.
2. **Ajoutez le plugin PWA.** `npm install -D vite-plugin-pwa`, puis déclarez `VitePWA()` dans `vite.config.ts`. Le plugin génère le manifeste et un service worker fondé sur Workbox, qui met en cache les fichiers produits par le build.
3. **Remplissez le manifeste** : `name`, `short_name`, `start_url`, `display`, `theme_color`, `background_color`, `lang`, et des icônes de 192 et 512 pixels de côté.
4. **Ajoutez une icône « maskable ».** Android découpe les icônes en cercle ou en carré arrondi. Une icône déclarée `maskable` garde son motif dans une zone sûre : un cercle centré dont le diamètre fait 80 % de l'icône. Sur une icône de 512 pixels, le motif doit tenir dans un cercle de 410 pixels environ.
5. **Choisissez la stratégie de mise à jour.** Avec `registerType: 'autoUpdate'`, la page se recharge dès qu'une version est prête. Avec `'prompt'`, un message propose la mise à jour et l'utilisateur choisit le moment. Si votre application contient des formulaires, préférez `'prompt'` : un rechargement en pleine saisie fait perdre des données.
6. **Réglez le chemin et le routage.** Sur GitHub Pages, l'application vit souvent sous un sous-chemin : réglez `base` (par exemple `/mon-app/`). Et un hébergement statique ne connaît pas vos routes : recharger `/mon-app/reglages` renvoie une erreur 404. Deux parades : router par `#` (`HashRouter`), ou publier un `404.html` qui recharge l'application.
7. **Testez sur un build.** Par défaut, le plugin n'active pas le service worker en développement. Lancez `npm run build` puis `npm run preview`, et ouvrez l'onglet Application des outils de développement du navigateur : manifeste, service worker et cache y sont visibles.

## Ce qui prend du temps ensuite

Une PWA qui tient en production demande plus que ces trois briques : un thème clair et sombre, plusieurs langues, des données qui survivent à une mise à jour, une synchronisation avec un serveur qui supporte les coupures de réseau, des tests, un budget de poids. Chaque projet réécrit ce cadre. C'est ce qu'un squelette évite.

## Comment PWA Starter Kit vous aide

PWA Starter Kit est le squelette des applications de la famille mister-guiiug : une application complète, testée et déployée, qui n'a pas de métier mais tout le cadre.

- **La pile** : React 19, Vite 8, TypeScript strict, Tailwind 4, React Router, Zustand. Le manifeste est engendré par une bibliothèque partagée (`@mister-guiiug/dev-pwa-config`) à travers `vite-plugin-pwa`, avec icônes `maskable` ; un `404.html` est produit au build pour les liens profonds.
- **Les mises à jour en mode `prompt`**, avec une vérification toutes les heures : la page ne se recharge jamais d'elle-même.
- **Deux langues** (français et anglais) et un **thème clair ou sombre**.
- **Un backend à repli local** : sans configuration, les données restent sur l'appareil. Avec deux variables (`VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`), les notes passent par Supabase, et les écritures faites hors ligne attendent dans une file puis repartent au retour du réseau. Migrations SQL, politiques RLS et tests de base de données sont fournis.
- **Une fonctionnalité d'exemple** (des notes) qui montre l'export et l'import des données, et la suppression annulable pendant huit secondes.
- **Une porte de qualité** : tests Vitest et Playwright, et un build qui échoue si le poids dépasse le budget ou si le diagnostic de conformité trouve un écart. Les choix techniques sont expliqués dans `docs/adr/`.

## Démarrer depuis le squelette

Le dépôt recommande de ne pas le cloner, mais de passer par son générateur : `npx github:mister-guiiug/create-lg-pwa-app mon-app`. Il remplace le nom partout, installe les dépendances, construit l'application et fait le premier commit. Avec `--publish`, il crée aussi le dépôt public et active GitHub Pages.

Deux précautions. La bibliothèque partagée est publiée sur GitHub Packages, qui exige un jeton même pour un paquet public : exportez `NODE_AUTH_TOKEN` (un jeton GitHub avec le droit `read:packages`) avant `npm install`. Et le squelette est pensé d'abord pour les applications de la famille. Son code est sous licence MIT : lisez-le, reprenez ce qui vous sert.

## Questions fréquentes

### Une PWA React fonctionne-t-elle hors ligne automatiquement ?

Pas entièrement. Le service worker met en cache les fichiers de l'application, qui peut donc s'ouvrir sans réseau. Les données venant d'un serveur demandent leur propre stratégie : stockage local, file d'écritures en attente. Le squelette montre les deux.

### HashRouter ou routage par chemin sur GitHub Pages ?

Les deux fonctionnent. Le routage par `#` évite toute 404 mais donne des adresses moins lisibles. Le routage par chemin demande un `404.html` de repli. Le squelette a choisi le chemin, et documente pourquoi.

### Pourquoi `prompt` plutôt que `autoUpdate` ?

Parce qu'un rechargement automatique peut tomber au milieu d'une saisie. Avec `prompt`, la nouvelle version se propose et l'utilisateur choisit le moment. La contrepartie : quelqu'un peut ignorer le message et rester longtemps sur une ancienne version.

### Peut-on utiliser le squelette sans Supabase ?

Oui. Il démarre sans aucune configuration, en mode local, et le dit dans ses réglages. Supabase n'est qu'un adaptateur qui s'active quand ses deux variables sont présentes.
