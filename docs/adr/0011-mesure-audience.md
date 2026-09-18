# 0011 — Une propriété GA4 pour le parc, l'application en dimension

> **Remplacée sur le CHOIX DE L'OUTIL par [0012](./0012-posthog-en-europe.md)**
> (18/09/2026) : la mesure passe à PostHog en Europe, pour une raison qui n'est
> pas la mesure mais la dette RGPD. **Tout le reste de cette page reste vrai et
> se transpose** — un seul projet pour le parc, l'application portée par une
> dimension plutôt que par le chemin, le consentement cloisonné par app, et les
> pièges de comptage. Elle garde aussi la trace de pourquoi dix-neuf propriétés
> ne pouvaient pas répondre à la question posée.

## Contexte

Le besoin, énoncé le 18/09/2026 : **suivre l'usage au global et à la maille
dépôt**. Les deux, pas l'un ou l'autre.

L'état au moment de la décision : dix-neuf PWA servies sous une seule origine,
`https://mister-guiiug.github.io/<dépôt>/`, et **dix-neuf propriétés GA4**, une
par dépôt, créées les 15 et 16/09/2026, chacune nommée comme son dépôt.

Cette forme répond à la moitié de la question, et **la seconde moitié n'a pas
de solution** :

- **GA4 gratuit n'a pas de propriété de synthèse.** Le _roll-up_ est une
  fonction 360. Avec N propriétés, la vue globale n'existe pas dans
  l'interface, et aucun réglage ne la fait apparaître.
- **La somme des dix-neuf ne la remplace pas.** Les sites partagent l'origine,
  donc le cookie `_ga`, donc l'identifiant de client — mais chaque propriété le
  compte pour elle. Un visiteur de trois applications est **trois utilisateurs**
  dans la somme et **un seul** en réalité. Les vues et les sessions
  s'additionnent ; les utilisateurs, non. Ni GA4 ni la Data API ne préviennent.

**Tag Manager a été examiné, et ne répond pas à ce besoin.** GTM livre des
balises ; il ne réunit aucune propriété. Le relevé du 16/09/2026 a par ailleurs
trouvé **quatre conteneurs, un par dépôt, tous les quatre vides** — zéro balise,
zéro déclencheur, zéro variable — supprimés le jour même. Un conteneur par
dépôt est une corvée par dépôt, et quatre sur quatre sont restés vides.

## Décision

**Une propriété GA4 pour le parc, un flux web, et l'application portée par une
dimension.**

1. **Une propriété, un flux.** Les sites partagent l'origine : un flux les
   couvre tous. **Rétention à 14 mois posée le premier jour** — elle n'est
   jamais rétroactive, et chaque jour d'attente en coûte un.

2. **`app_name`, dimension personnalisée à portée événement**, jointe à chaque
   événement par `trackEvent` du socle et **déduite du chemin de base**
   (`/mister-cim10/` → `mister-cim10`). Aucune configuration par application :
   une application de plus arrive instrumentée sans que personne y pense.

   **Pas `page_path`.** Au-delà d'environ 500 lignes, les rapports standard
   rangent le reste dans « (other) » ; vingt applications aux chemins distincts
   y arrivent, et la ventilation devient trouée sans prévenir. `app_name` a
   autant de valeurs qu'il y a d'applications.

3. **gtag en direct, pas de GTM.** Une propriété, un identifiant : rien à
   router. Et le parc a déjà un gestionnaire de balises centralisé — c'est
   `dev-pwa-config`, qui est versionné, testé, relu en PR et publié une fois.

4. **Le consentement reste cloisonné par application**, porté par le chemin de
   base comme aujourd'hui. Les applications sont des outils sans rapport entre
   eux : accepter la mesure sur un lanceur de dés ne dit rien de ce qu'on veut
   sur un outil de cotation médicale. C'est un choix conservateur assumé — un
   seul éditeur, une seule origine, on pourrait défendre un consentement unique
   et moins de bandeaux.

5. **Le cookie reste partagé** : `cookie_path` à `/`. C'est l'inversion qui
   compte — à N propriétés on voudrait cloisonner, à une propriété le partage
   de l'identifiant de client est **ce qui rend le compte d'utilisateurs juste**.
   Le domaine, lui, se **mesure** et ne se devine pas (`domaineDeCookie`,
   socle ≥ 4.21.3) : `github.io` est un suffixe public.

6. **Mesure améliorée : « modifications de page basées sur les événements de
   l'historique du navigateur » DÉSACTIVÉE.** Les applications sont en
   `HashRouter` ; chaque navigation déclenche un événement d'historique, et GA4
   enverrait une vue **en plus** de celle de `usePageViews`. Chaque navigation
   comptée deux fois, silencieusement. C'est le même défaut que
   `send_page_view: false` écarte au chargement.

## Conséquences

Le global et la maille application sortent des **mêmes données** : pas
d'agrégation, pas de divergence possible, et « utilisateurs » redevient un
chiffre publiable.

`parc-dashboard` lit **une** propriété au lieu de dix-neuf : un appel de la
Data API, un quota, une ventilation par `app_name`. Et son `historique.json`
devient la mémoire longue au-delà des quatorze mois de rétention.

Une seule liste de sous-traitants, une seule durée de conservation, un seul
responsable de traitement à déclarer.

**Le prix, et il faut le connaître :**

- **Le budget de 500 noms d'événements est désormais commun.** Un vocabulaire
  partagé — `export`, `install_prompt`, `offline_use` — cesse d'être une
  élégance : c'est ce qui rend la comparaison possible entre applications, et
  ce qui empêche le plafond d'arriver.
- **Les droits GA4 sont par propriété.** Impossible de donner à quelqu'un les
  chiffres d'une seule application. Sans objet pour un parc mono-mainteneur,
  jusqu'au jour où une application change de main.
- **Les réglages deviennent communs** : rétention, filtres de trafic interne,
  attribution.
- **La règle « le nom de la propriété est le nom du dépôt » disparaît.** Elle
  avait été posée le 15/09 pour rendre le rapprochement rejouable sans table de
  correspondance et faire sauter aux yeux une propriété orpheline. Ce contrôle
  se déplace vers les valeurs de `app_name` — il ne s'évapore pas, il est à
  réécrire.
- **Les dix-neuf propriétés existantes sont gelées, pas supprimées.** **GA4 ne
  sait pas déplacer un flux d'une propriété à une autre** : leurs données ne
  repartiront nulle part. Renommées `archive — <dépôt>`, gardées. C'est le sort
  qu'a déjà connu `archive-multi-sites`, pour la même raison.

## Ce qu'on écarte

**N propriétés, une par dépôt.** Donne la maille application et rien d'autre.
Le global y est inatteignable sans 360 ni ETL, et la somme des utilisateurs y
est fausse par construction.

**Le double marquage** — chaque site vers sa propriété **et** vers une
propriété parc. Il marche, le global y est natif avec toute l'exploration, et
il coûte dix lignes dans le socle. Mais il fabrique **deux chiffres censés être
égaux** — la somme des dix-neuf et le total du parc — qui divergeront dès
qu'une application ratera une montée, sans que rien ne dise lequel croire.

**GTM, et il est RETIRÉ DU SOCLE — pas seulement écarté.**

Le premier jet de cette page disait le contraire : « la capacité reste dans le
socle, non exercée — elle est testée, elle ne coûte rien à garder ». Un relevé
fait le même jour l'a démentie, sur un fait qui n'était pas connu en
l'écrivant : **le compte Tag Manager ne porte plus aucun conteneur.** Les quatre
qui existaient — un par dépôt, tous vides — ont été supprimés le 16/09. Le mode
`gtm` du socle n'a jamais tourné en production, et il ne le peut plus : il n'y a
plus rien à charger. Une capacité que rien n'exerce **et que rien ne peut
exercer** n'est pas une capacité, c'est l'apparence d'une, avec des tests verts
pour la garantir.

Retirés (`dev-pwa-config` #309) : `parseGtmContainerId` — des deux modules qui
en portaient une copie —, l'option `gtmContainerId` (`initAnalytics`,
`useConsentChoice`, `ConsentBanner`, `ConsentSettings`, `pwaSeoPlugin`), le mode
`gtm` et le chargement de `gtm.js`, les branches `dataLayer` de `trackEvent` et
`setUserProperties`, la moitié GTM de `buildAnalyticsHtmlFragments` avec son
`<iframe>` `noscript`, et la variable de build `VITE_GTM_CONTAINER_ID`.
**C'est un majeur** : des exports disparaissent, même si aucune application du
parc ne les utilisait.

La condition du retour reste précise : le jour où une balise **non-GA4** devra
être posée sans release. Ce jour-là, ce sera **un conteneur unique**,
l'identifiant de mesure passé par la couche de données, et l'export du conteneur
committé pour qu'il se relise en PR. Le rétablir coûte une centaine de lignes ;
ce paragraphe dit lesquelles.

**`cookie_path` par application.** Isolerait les identités — c'est exactement
ce qu'on ne veut pas ici.

## Mise en œuvre

L'ordre compte, parce qu'une étape ne peut pas précéder l'autre.

1. ✅ **Fait le 18/09/2026.** Propriété `mister-guiiug — parc`
   (`properties/554938331`), flux web sur `https://mister-guiiug.github.io/`,
   **`G-TVVT0ZNC3Q`**. Rétention à 14 mois, relue après écriture. Dimension
   `app_name` déclarée, portée événement. Vues sur événement d'historique
   désactivées. Script idempotent : `ga4-propriete-parc.mjs`.
2. ✅ Socle : `app_name` joint à chaque événement (#308), Tag Manager retiré
   (#309). **Reste à publier** — une version sur `main` n'est pas publiée.
3. Poser `G-TVVT0ZNC3Q` dans les dix-neuf variables `VITE_GA_MEASUREMENT_ID`,
   en une passe, puis redéployer.
4. **Vérifier la collecte dans un vrai navigateur** avant toute suite : une
   visite, un consentement, une vue qui arrive dans la bonne propriété avec son
   `app_name`. Rien d'irréversible avant cette preuve.
5. Seulement alors, traiter les dix-neuf anciennes propriétés.
6. Écrire la déclaration : sous-traitants, durée, responsable de traitement.

**CE QU'ON FAIT DES DIX-NEUF ANCIENNES, ET POURQUOI PAS TOUT DE SUITE.** Relevé
du 18/09/2026, par l'API de rapport, avant toute décision : **dix-huit d'entre
elles collectent**, de 14 à 59 événements chacune, et `archive-multi-sites` en
porte 3 877. Les supprimer aujourd'hui éteindrait la mesure de dix-huit sites et
jetterait leurs données — GA4 ne sait pas déplacer un flux. Elles ne deviennent
supprimables qu'après l'étape 4.

Deux exceptions, mesurées : `miss-supatool` est à zéro événement mais **sa
variable est posée**, donc son site est instrumenté et l'attend ; `mister-doc`
est à zéro **et** sans variable — la seule qui ne serve déjà plus à rien. Le
script `ga4-supprimer-inutiles.mjs` refuse toute propriété qui ne réunit pas les
trois conditions : n'avoir jamais collecté, ne pas être déjà en corbeille, et
qu'aucun dépôt ne vise son identifiant.

`mister-doc` reste hors mesure tant que ses mentions portent leurs
`[À compléter]`.
