## Pour qui

Les développeurs qui veulent démarrer une application React installable et utilisable hors ligne, avec un cadre déjà décidé. C'est le squelette des applications de la famille mister-guiiug.

## Comment ça marche

Son générateur crée votre dépôt en une commande : `npx github:mister-guiiug/create-lg-pwa-app mon-app --from main`. Vous partez de React, Vite, TypeScript et Tailwind, avec un manifeste, un service worker, deux langues, un thème clair ou sombre, des tests et un budget de poids. La version publiée montre le squelette en marche, autour d'une petite application de notes.

## Vos données

Sur la version publiée, les notes restent dans le stockage local de votre navigateur : aucun compte n'est demandé, et elles ne quittent pas l'appareil. Quand une application tirée du squelette branche Supabase, ses notes partent dans sa base, derrière une connexion par lien reçu par e-mail ou par mot de passe. Sentry n'est chargé que si un DSN est posé au build. PostHog, dans son nuage européen, ne mesure l'audience qu'après accord dans un bandeau, qui ne s'affiche même pas sans clé.

## Prix

Gratuit et open source, sous licence MIT : lisez le code, reprenez ce qui vous sert.
