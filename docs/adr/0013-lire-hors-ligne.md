# 0013 — Lire hors ligne : le dernier état connu, copié derrière le port

## Contexte

L'audit hors ligne du 05/11/2026 a rechargé hors ligne, dans Chromium, les
vingt-trois applications publiées, puis lu leur code. Le squelette y est classé
OFFLINE-FIRST en mode local — la vérité est sur l'appareil —, mais son **modèle
Supabase** n'était qu'une coquille pour la lecture, et ce modèle part dans
chaque naissance :

- **aucune copie de lecture.** Ni règle `apiOrigins` dans `pwaBaseOptions`, ni
  cache applicatif. Hors ligne, la liste ne se lisait plus ;
- **un commentaire faux.** `queued-notes.ts` et l'ADR [0010](./0010-ecrire-hors-ligne.md)
  affirmaient que « c'est le service worker qui répond ». Aucune règle de cache
  ne visait Supabase ; miss-holi-voyage portait la même phrase, recopiée ;
- **une CSP fermée au projet.** `cspPlugin` n'ouvre `connect-src` qu'à
  `'self'`, PostHog et Sentry. miss-arcade, publiée en mode Supabase, relevait
  six refus au premier chargement et tournait sur ses valeurs de démonstration,
  **même en ligne**.

En face, mister-settle avait écrit la pièce qui manque (`backend/cached.ts`) :
chaque lecture gardée dans IndexedDB, revalidée par zod, resservie quand le
réseau manque, et l'écran prévenu qu'il lit une copie.

## Décision

**Une copie par port, tenue par l'application, pas par le service worker.**
`createCachedNotes` enveloppe l'adaptateur Supabase au plus près du réseau. Chaque
lecture réussie est copiée, avec sa date, dans la base IndexedDB de l'application
(`createIdb` du socle). Quand le réseau manque, la copie est resservie,
**revalidée par le schéma du port** : une copie écrite par une autre version de
l'application ne passe pas, et l'erreur d'origine remonte à sa place.

**La copie répond à une coupure, et à rien d'autre.** L'appareil se dit hors
ligne, ou le SDK rend une erreur que `classifyBackendError` classe « réseau ».
Un refus de la RLS servi en copie ferait croire que tout va bien.

**L'écran le dit, avec la date.** L'instantané de la copie porte `staleAt` ;
`StaleCopy` affiche « copie enregistrée il y a… », propose de relire, et relit
de lui-même au retour du réseau. Une copie qui se fait passer pour l'état du
moment est le défaut que l'audit relève ailleurs, sous la forme d'un bandeau qui
promet ce que l'application ne fait pas.

**Les écritures acceptées retouchent la copie ; celles en attente sont posées
par-dessus.** Sans la première règle, une note écrite après la dernière lecture —
et bien arrivée — disparaîtrait au rechargement hors ligne. Sans la seconde, une
note écrite hors ligne disparaîtrait de l'écran en attendant de partir, et
l'utilisateur la réécrirait. La file (`queued-notes.ts`) applique donc ce
qu'elle n'a pas encore envoyé à ce que rend la lecture, serveur ou copie. La
date de la copie, elle, reste celle de la dernière liste **complète** lue.

**La copie meurt avec la session.** L'événement `SIGNED_OUT` d'`AuthProvider`
la purge — déconnexion, jeton que le SDK ne rafraîchit plus — et l'effacement
du compte la purge sans l'attendre. Une lecture partie avant la purge, avec le
jeton du compte précédent, ne la réécrit pas en arrivant (un compteur de
génération).

**La CSP s'ouvre au projet, et à lui seul.** `vite.config.ts` passe à
`connectSrc` l'origine de `VITE_SUPABASE_URL`, en `https:` et en `wss:`
(Realtime), quand le backend retenu est Supabase — même règle et même module
que le sélecteur (`resolveBackendKind`, `missingConfig`). L'origine exacte et
non le joker `*.supabase.co` : c'est la règle que le socle applique déjà au DSN
Sentry, et elle suit aussi la pile locale de la CLI (`http://127.0.0.1:54321`),
que le joker laissait bloquée en développement.

## Ce que les tests prouvent, et où

`src/backend/cached-notes.test.ts`, contre un serveur de comptoir : la copie est
resservie et datée sur une coupure, pas sur un refus ; une copie que le schéma
refuse est écartée ; les écritures acceptées la retouchent, les refusées non ; la
purge l'efface, et une lecture arrivée après la purge ne la réécrit pas.

`src/backend/queued-notes.test.ts` : relue, la liste montre aussi ce qui attend.

`src/backend/purge-lecture.test.ts`, sur le backend construit pour de vrai en
mode distant : `SIGNED_OUT` purge, l'effacement du compte aussi.

La CSP s'ouvre à l'origine exacte du projet Supabase par le socle
(`cspPlugin`, 6.32.0, qui lit `VITE_SUPABASE_URL`) : `src/app/config/csp.ts`,
promu, a été retiré.

`e2e/hors-ligne.spec.ts`, `@critical` : la **build de production**, rouverte
sans réseau — `setOffline` et toutes les requêtes refusées —, démarre et relit
ses notes. C'est l'essai qui a trouvé, le 05/11, trois applications publiées
qui ne démarraient plus hors ligne. Il tourne en mode local, comme toute la
suite : la copie du mode Supabase est prouvée au niveau du port.

## Conséquences

- Hors ligne, une application engendrée **avec Supabase** relit le dernier état
  connu, au lieu d'un écran d'erreur.
- **La copie peut être vieille, et l'écran ne dit que sa date.** Ce qu'un autre
  appareil a écrit depuis n'y est pas.
- **Elle dort sur l'appareil**, en clair, comme le magasin local : IndexedDB
  n'est pas chiffré. La purge à la déconnexion est la protection de l'appareil
  partagé ; elle ne protège pas d'un accès au profil du navigateur.
- **IndexedDB indisponible** (navigation privée de Firefox) : pas de copie, et
  la lecture hors ligne échoue comme avant — le socle se dégrade sans lever.
- **La file d'écritures survit à la déconnexion**, et ce n'est pas réglé ici.
  Ses entrées ne portent pas l'identité de leur auteur : rejouées après qu'un
  autre compte s'est connecté sur l'appareil, elles s'écriraient chez lui. La
  jeter sans prévenir est le défaut que l'audit relève chez miss-uwh et
  miss-lookhouse ; la bonne réponse — compter, demander, comme mister-doc — est
  une autre décision.
- **Chaque port ajouté décide de sa copie.** La règle est écrite ici : une
  lecture se copie, revalidée par son schéma ; une écriture acceptée retouche.

## Ce que ça écarte

- **`apiOrigins` du socle** (Workbox, `NetworkFirst`). Le socle n'en pose aucune
  par défaut, et il a raison : Workbox range les réponses par URL, sans tenir
  compte de l'en-tête `Authorization`. Sur un appareil partagé, le compte suivant
  relirait les réponses du précédent, et l'application ne verrait pas ce cache
  pour le purger. miss-carbook l'a, et l'audit le relève.
- **Persister le magasin Zustand.** L'état d'écran n'est pas la vérité du
  serveur : il porte une suppression en sursis, une erreur, une note refusée.
  Le persister, c'est relire hors ligne un état que personne n'a confirmé.
- **Le joker `*.supabase.co`** dans la CSP, que mister-settle utilise : plus
  large qu'il ne faut, et aveugle à la pile locale.
- **Ouvrir la CSP en permanence**, mode local compris : une politique plus
  permissive que ce que l'application fait est une protection qu'on croit
  avoir.
