# 0012 — PostHog en Europe remplace GA4

**Remplace [0011](./0011-mesure-audience.md) sur le choix de l'outil.** Ce que
0011 décidait de la FORME — une seule propriété pour le parc, l'application
portée par une dimension, le consentement cloisonné par app — reste vrai et se
transpose. Seule la destination change.

## Contexte

**Ce n'est pas la mesure qui a manqué, c'est la posture juridique.**

Relevé du 18/09/2026, une fois GA4 en place : **14 à 59 événements par
propriété sur trois jours**, soit de l'ordre de **180 événements et 20 sessions
par jour pour les dix-huit applications réunies**. À ce volume, aucun outil
n'est le facteur limitant — GA4 aurait très bien fait le travail, et le fera
jusqu'à la bascule.

Ce qui coince est ailleurs, et l'audit du même jour l'avait nommé : **aucune
application du parc ne porte la moindre mention légale**, sur un parc dont
`mister-cim10` reçoit du texte clinique saisi par des professionnels de santé.
GA4 rend cette dette obligatoire et incompressible :

- un cookie `_ga` est **nécessaire** à son fonctionnement, donc un bandeau de
  consentement l'est aussi — l'exemption de la CNIL pour la mesure d'audience
  strictement limitée lui est hors de portée ;
- les données partent aux **États-Unis**, ce qui se déclare et s'assume ;
- une durée de conservation est à publier — elle vient d'être portée à quatorze
  mois, et ce relèvement lui-même doit figurer dans les mentions.

La question posée n'est donc pas « GA4 mesure-t-il bien ». Elle est : **une
application de santé, publique et sans mentions, doit-elle poser un cookie
Google ?** La réponse retenue est non.

## Décision

**PostHog, sur le nuage EUROPÉEN.**

### 1. `eu.posthog.com`, jamais `us.`

L'ingestion est `https://eu.i.posthog.com`. **PostHog ne sait pas déplacer un
projet des États-Unis vers l'Europe** — c'est le même piège que les flux GA4,
qu'on ne sait pas déplacer d'une propriété à une autre, et le parc l'a déjà payé
avec `archive-multi-sites`. Se tromper de nuage à l'inscription, c'est repartir
de zéro une seconde fois.

### 2. Un seul projet, l'application en propriété d'événement

La forme de 0011 se transpose telle quelle : un projet pour les vingt sites, et
`app_name` — déduit du chemin de base par le socle, sans configuration par
application — enregistré en **super-propriété** pour accompagner chaque
événement. Le global est natif, le détail est un filtre, et les deux sortent des
mêmes données.

### 3. Trois réglages qui ne sont PAS des préférences

- **`autocapture: false`.** Active par défaut, elle enregistre les clics **avec
  le texte des éléments**. Sur un outil de cotation, elle capterait des libellés
  de diagnostic. C'est le réglage le plus important de cette page.
- **`disable_session_recording: true`.** Le replay filmerait le compte-rendu
  pendant sa saisie.
- **Pas de collecte d'adresse IP** côté projet.

Aucun des trois ne doit dépendre d'une case cochée dans une console : ils sont
posés **en code, dans le socle**, et tenus par des tests. C'est la leçon que
cette même journée a tirée de Tag Manager.

### 4. Le consentement reste, et reste cloisonné par application

PostHog sans cookie reste un accès au terminal : l'exemption CNIL se mérite au
cas par cas, elle ne se décrète pas. Le bandeau reste donc en place, avec sa
portée par chemin de base. **Si l'analyse juridique conclut plus tard à
l'exemption, le bandeau se retire — l'inverse ne serait pas rattrapable.**

### 5. La même API pour les applications

`initAnalytics`, `trackEvent`, `trackPageView`, `setAnalyticsConsent`,
`usePageViews`, `ConsentBanner` gardent leurs noms et leurs contrats. Les
applications ne changent qu'un nom de propriété. C'est tout l'intérêt d'avoir
mis la mesure dans le socle plutôt que dans vingt `index.html`.

PostHog est une **pair optionnelle chargée par `loader`**, comme `@sentry/react`
— une application sans mesure n'en paie pas le poids.

## Conséquences

**Ce qu'on gagne.** L'hébergement européen supprime la question du transfert.
Le client est nettement plus léger que les 457 ko de `gtag.js`. Et les mentions
à écrire se réduisent à un sous-traitant, une finalité, une durée.

**Ce qu'on perd, et c'est réel :**

- **L'historique GA4.** 3 877 événements dans `archive-multi-sites` et trois
  jours sur dix-huit propriétés. Rien ne se transfère.
- **Une seconde migration du parc**, quelques heures après la première : socle
  en **6.0.0** (majeur — l'API de mesure change), dix-neuf variables, dix-neuf
  déploiements. La première n'aura servi qu'à prouver la chaîne.
- **La garde e2e est à refaire.** `playwright-entree` lit `window.dataLayer`,
  que PostHog n'alimente pas. Neuf applications en dépendent.
- **Un outil de produit, pas de web analytics.** PostHog ne rend ni les
  rapports d'acquisition ni l'intégration Search Console. La balise de
  vérification de propriété Google, elle, ne bouge pas : elle ne mesure rien.

## Ce qu'on écarte

**Rester sur GA4.** C'était la recommandation la veille de cette page, sur un
argument de calendrier : la cible venait d'être posée. Elle traite la dette
RGPD comme quelque chose à _documenter_ plutôt qu'à _supprimer_. Le propriétaire
a tranché pour la supprimer.

**GA4 et PostHog en parallèle**, le temps de comparer. Deux mesures qui se
doublent, deux bandeaux à justifier, et la dette juridique conservée pendant
toute la période — c'est-à-dire exactement ce qu'on cherche à quitter.

**Matomo ou Plausible.** Défendables sur les mêmes bases, et plus légers
encore. PostHog est retenu parce qu'il couvre en plus les entonnoirs et les
drapeaux de fonctionnalité, sans second outil à poser le jour où ils serviront.

**Le nuage américain de PostHog.** Il annulerait la seule raison de bouger.

## Mise en œuvre

L'ordre compte, et la première étape n'est pas la mienne.

1. **Créer le compte sur `https://eu.posthog.com`** et un projet unique.
   **Seul le propriétaire peut le faire** : la création de compte et la saisie
   d'identifiants ne sont pas des gestes que l'assistant pose. Il en ressort une
   clé `phc_…`, publique par conception, qui se pose en `vars` comme un `G-…`.
2. Socle : adaptateur PostHog derrière l'API existante, les trois réglages de
   §3 en dur, `app_name` en super-propriété, et la garde e2e refaite.
3. Publier le socle en **6.0.0**.
4. Dix-neuf dépôts, en une passe : `^6.0.0`, `VITE_POSTHOG_KEY`, retrait de
   `VITE_GA_MEASUREMENT_ID`, hôtes PostHog dans les CSP à la place des hôtes
   Google, et `…@v5` → `…@v6` dans les workflows.
5. **Vérifier dans un vrai navigateur** sur une application pilote : aucun
   script Google, un événement PostHog après consentement seulement, `app_name`
   présent. Rien d'irréversible avant cette preuve.

   **Fait le 19/09/2026**, sur ce dépôt construit en production et servi
   localement, avec la clé réelle du projet. Le mode développement ne prouverait
   rien : `cspPlugin` y pose `'unsafe-inline'`, et ni le service worker ni le
   chemin de base ne sont ceux du visiteur.

   | ce qui était à prouver      | relevé                                                                                                                    |
   | --------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
   | aucun script Google         | un seul script, celui de l'app ; `window.dataLayer` absent                                                                |
   | rien avant l'accord         | **le morceau PostHog n'est même pas téléchargé** — le bandeau posé, la requête réseau se limite au bundle de l'app        |
   | un événement après l'accord | `eu.i.posthog.com/e/` → 200, au clic sur « Accepter »                                                                     |
   | `app_name` présent          | `app_name: "pwa-starter-kit"`, **relu côté serveur** dans l'API du projet, pas seulement dans la page                     |
   | le refus                    | rien : pas de morceau chargé, pas de cookie PostHog, pas d'événement. Seul `dwc_consent:/pwa-starter-kit/` garde le choix |

   **Et une affirmation démentie au passage.** Le socle documentait l'hôte
   `eu-assets.i.posthog.com` en `script-src` comme une précaution, en écrivant
   que rien n'en était chargé quand `posthog-js` est en dépendance. C'est faux :
   `array/<clé>/config.js` en part à chaque `init`, en `initiatorType: "script"`.
   L'hôte est nécessaire, et une CSP qui l'omettrait couperait la mesure en
   silence.

6. Écrire les mentions — un sous-traitant, une finalité, une durée, un
   responsable de traitement. C'est la raison d'être de ce chantier.
7. **Alors seulement**, démanteler GA4 : les vingt propriétés et le compte.
   `archive-multi-sites` est le seul endroit où vit l'historique des cinq
   anciens flux — le supprimer est définitif, et c'est une décision à prendre
   pour elle-même.

`mister-doc` reste hors mesure tant que ses mentions portent leurs
`[À compléter]` — et ce chantier est précisément ce qui permettra de les
remplir.
