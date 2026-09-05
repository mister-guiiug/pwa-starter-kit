# 0007 — Comptes et droits : la base décide, l'interface se contente d'obéir

## Contexte

Le socle a le **port** d'authentification (`auth/*`), un instantané React et une
garde — et depuis la 3.33.0, le fournisseur, le formulaire et le défi MFA. Le
relevé du 05/09/2026 est pourtant sans appel : cette couche compte **dix copies
dans cinq applications, et zéro migration**. Quatre `AuthProvider` (161, 62, 218
et 119 lignes) pour le même contrat, quatre formulaires pour le même écran.

Côté base, trois dépôts portent chacun leur `profiles` + `handle_new_user` +
`touch_updated_at` + `is_admin`. `GISEMENTS.md` avait tranché : le paquet npm ne
franchit ni Deno ni Postgres, mais « la valeur n'existe qu'à la naissance d'une
application ». C'est ce moment.

Et il n'y a **rien** pour les droits : `useActionGuard` garde des actions — en
ligne, confirmé — pas des rôles.

## Décision

**Trois couches, et une seule fait autorité.**

1. **La base décide.** Les tables naissent en `enable row level security` sans
   aucune politique : un schéma poussé à moitié refuse tout au lieu d'exposer.
   `0003_rls.sql` ouvre ensuite le strict nécessaire, avec un **double verrou** —
   les droits SQL retirés puis redonnés un par un, en plus des politiques. Une
   politique mal écrite ne suffit alors pas à ouvrir une table.
2. **Les rôles ne s'attribuent pas depuis le navigateur.** `user_roles` n'a
   aucune politique d'écriture : les rôles se posent par la clé `service_role`,
   qui ne quitte jamais le serveur.
3. **`useRole()` est un confort d'interface.** Il masque un bouton que la base
   refuserait de toute façon. Ce n'est pas une autorisation.

Côté application, `AuthProvider` du socle avec l'adaptateur Supabase, et
`LoginForm` tel quel.

## Conséquences

`adapter={null}` met le fournisseur en **mode local** : l'état reste
« déconnecté » et les actions rendent `{ ok: false, code: 'local-mode' }`.
L'écran de compte existe donc toujours et **dit** qu'aucun backend n'est
configuré, au lieu de disparaître derrière une condition. Un écran masqué finit
par diverger de celui qui s'affiche, et personne ne le voit avant la mise en
service — un test e2e fige ce comportement.

Le prix : les politiques doivent être **exécutées**, pas relues. Une politique
se lit vite et se trompe de même, et c'est le seul endroit du système où une
erreur d'une ligne expose une table entière à une clé publique. D'où
`supabase/tests/rls.test.sql` en pgTAP : onze assertions qui prouvent que deux
comptes ne se voient pas, que `anon` ne voit rien, et que personne ne peut
s'attribuer un rôle.

Un piège figé dans ces tests : `set local role authenticated` est
indispensable. Sans lui, la session garde `bypassrls`, **tout passe, et le test
est vert et faux**.

## Ce qu'on écarte

**`force row level security`.** Sur Supabase, `postgres` porte `bypassrls` et
n'est pas superutilisateur : la directive ne protégerait rien et casserait les
migrations.

**Lire les rôles dans une table depuis le navigateur.** Cela ferait croire que
l'autorisation vient du client. Le rôle est lu dans le jeton, et il ne sert
qu'à l'affichage.

**Filtrer par `user_id` dans les requêtes du front.** La RLS le fait déjà.
L'ajouter donnerait l'illusion que la sécurité vient du client, et rendrait
impossible de vérifier la protection sans lire le front.
