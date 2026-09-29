---
title: Rendre une application React installable : critères et invite
description: Rendre une application React installable : critères de Chrome, manifeste, bouton d'installation, iPhone, Safari et Firefox, et comment tout vérifier.
date: 2026-09-29
answer: Une application React devient installable quand elle est servie en HTTPS avec un manifeste qui donne un nom, des icônes de 192 et 512 pixels, une adresse de départ et un mode d'affichage comme standalone. Chrome propose alors l'installation, l'iPhone passe par le menu Partager, et Firefox de bureau ne l'offre pas.
---

# Rendre une application React installable

Installer une application web, c'est lui donner une icône sur l'écran d'accueil ou dans la liste des applications, et une fenêtre à elle. React n'y est pour rien : ce qui rend une application installable, c'est son manifeste, HTTPS et les règles de chaque navigateur. La mise en place d'une PWA est décrite dans [Créer une PWA avec React et Vite](creer-une-pwa-avec-react-et-vite.html) ; cette page traite de l'installation elle-même.

## Les critères de Chrome

Selon web.dev, Chrome propose l'installation, et déclenche l'événement `beforeinstallprompt`, quand toutes ces conditions sont réunies :

- l'application n'est pas déjà installée ;
- la personne a cliqué ou touché la page au moins une fois, et l'a regardée au moins 30 secondes, lors de cette visite ou d'une précédente ;
- la page est servie en HTTPS ;
- le manifeste contient `name` ou `short_name`, des icônes de 192 et de 512 pixels, `start_url`, et un `display` parmi `fullscreen`, `standalone`, `minimal-ui` et `window-controls-overlay` ;
- `prefer_related_applications` est absent, ou vaut `false`.

Cette liste ne mentionne pas de service worker : il sert au démarrage hors ligne, pas à l'installation. web.dev recommande en plus une description et des captures d'écran dans le manifeste, qui enrichissent la fenêtre d'installation. La même page précise qu'une personne peut installer l'application même quand ces critères ne sont pas remplis.

## Un bouton « Installer » dans l'application

Sur les navigateurs Chromium, l'application peut proposer sa propre invite. Le principe, décrit par MDN et web.dev :

1. écouter `beforeinstallprompt`, appeler `preventDefault()` pour retenir la proposition du navigateur, et garder l'événement de côté ;
2. afficher votre bouton ;
3. au clic, appeler `prompt()` sur l'événement gardé, puis lire la réponse de la personne.

Dans un composant React, cela tient dans un effet qui enregistre l'écouteur et un état qui garde l'événement. Mais MDN classe cet événement parmi les fonctions à disponibilité limitée : Safari et Firefox ne le connaissent pas, et `prompt()` ne marche pas sur iOS. Il faut donc un autre chemin pour ces navigateurs.

Proposer sans harceler compte autant que le bouton. Une invite qui revient à chaque visite se fait fermer sans être lue ; un « Plus tard » ne veut pas dire « Jamais ».

## iPhone, iPad, Mac, Firefox et Android

- **iPhone et iPad** : depuis iOS 16.4, on installe depuis le menu Partager de Safari, Chrome, Edge, Firefox ou Orion ; avant, seul Safari le permettait. Sans `beforeinstallprompt`, l'application ne peut qu'expliquer le geste : Partager, puis Sur l'écran d'accueil.
- **Safari sur Mac** : depuis macOS Sonoma et Safari 17, le menu Fichier, puis Ajouter au Dock, installe n'importe quelle application web, avec ou sans manifeste.
- **Firefox de bureau** : selon MDN, il ne prend pas en charge l'installation d'une PWA par son manifeste.
- **Android** : seuls Chrome, sur les appareils dotés des services Google, et Samsung Internet installent une vraie application. Les autres navigateurs ajoutent un raccourci marqué de leur icône, qui rouvre le site dans le navigateur.

## Savoir si l'application est déjà installée

Lancée depuis son icône, une PWA s'affiche dans le mode demandé par son manifeste. La requête média `display-mode` le révèle : `standalone`, `minimal-ui`, `fullscreen` ou `window-controls-overlay`. Sur iPhone, la propriété non standard `navigator.standalone` sert de repli. Inutile, alors, d'afficher l'invite.

## Vérifier avant de publier

Ouvrez l'onglet Application des outils de développement de Chrome : la rubrique Manifest affiche le manifeste lu et, en cas de problème, une section Installability qui décrit l'erreur, par exemple une icône introuvable. Testez ensuite sur de vrais appareils : un iPhone, un Android, un ordinateur.

## Comment PWA Starter Kit vous aide

[PWA Starter Kit](https://mister-guiiug.github.io/pwa-starter-kit/) applique tout cela, et son invite d'installation se trouve dans l'écran À propos.

- **Le manifeste** est engendré par la bibliothèque partagée de la famille : mode `standalone`, icônes de 192 et 512 pixels, une icône `maskable`, et deux captures d'écran, étroite et large.
- **L'invite suit le navigateur** : sur Chromium, elle attend `beforeinstallprompt` ; sur iPhone, iPad et Safari, elle affiche les gestes à faire ; dans les navigateurs intégrés à une autre application (Facebook, Instagram…), elle se tait, puisqu'on ne peut rien y installer.
- **Une cadence mesurée** : proposée dès la première fois, l'invite se tait ensuite un mois, et n'est jamais proposée plus de trois fois.
- **L'application déjà installée** est reconnue par son mode d'affichage, et l'invite ne s'affiche pas.

Pour partir du squelette, passez par son générateur, avec l'option `--from main` pour la version décrite ici. Son code est sous licence MIT.

## Questions fréquentes

### Faut-il un service worker pour qu'une application soit installable ?

Pas pour Chrome : ses critères, publiés sur web.dev, demandent HTTPS et un manifeste complet, sans service worker. Il reste indispensable pour que l'application démarre hors ligne.

### Pourquoi le bouton d'installation n'apparaît-il pas sur iPhone ?

Parce que l'événement `beforeinstallprompt` n'existe pas sur iOS. L'application doit expliquer le geste : ouvrir le menu Partager, puis choisir Sur l'écran d'accueil. Depuis iOS 16.4, c'est possible dans Safari, Chrome, Edge, Firefox et Orion.

### Comment installer une PWA sur Mac ?

Avec Chrome ou Edge, par le bouton d'installation de la barre d'adresse ou le menu. Avec Safari 17 et macOS Sonoma ou plus récent, par Fichier, puis Ajouter au Dock.

### Firefox peut-il installer une PWA ?

Pas sur ordinateur, selon MDN. Sur Android, Firefox ajoute un raccourci sur l'écran d'accueil, qui rouvre le site dans le navigateur.

## Sources

- [Critères d'installation, web.dev](https://web.dev/articles/install-criteria) : les conditions de Chrome.
- [Rendre une PWA installable, MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable) : prise en charge par navigateur et par système.
- [Événement beforeinstallprompt, MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeinstallprompt_event) : disponibilité limitée, méthode `prompt()`.
- [Proposer sa propre invite, web.dev](https://web.dev/articles/customize-install) : retenir l'événement, puis l'utiliser au clic.
- [Déboguer une PWA, Chrome DevTools](https://developer.chrome.com/docs/devtools/progressive-web-apps) : la section Installability du manifeste.
