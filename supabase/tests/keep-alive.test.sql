-- Le ping anti-pause — pgTAP. Lancement : `supabase test db`.
--
-- CE QUE CE FICHIER PROUVE : ce dont `supabase-keepalive.yml` a besoin pour
-- que son SELECT anonyme soit une vraie requête de base, et rien de plus.
-- Sans la table, PostgREST répond 404 sur son cache de schéma et le ping ne
-- réveille rien (miss-bonus-quest, 23/11/2026) ; sans le `grant`, il répond
-- 401.
--
-- Il prouve aussi la moitié qu'on oublie : `anon` ne peut QUE lire. La clé
-- anonyme est publiée dans le bundle, et cette table est la seule de `public`
-- dont la policy dit `using (true)` pour `anon`.

begin;
select plan(6);

select has_table('public', 'keep_alive', 'la table du ping existe');

select table_privs_are(
  'public', 'keep_alive', 'anon', array['SELECT'],
  'anon n''a que SELECT sur keep_alive'
);

select table_privs_are(
  'public', 'keep_alive', 'authenticated', array[]::text[],
  'authenticated n''a aucun droit sur keep_alive'
);

-- ── Ce que fait le ping, sous le rôle du ping ─────────────────────────────

set local role anon;

-- La ligne de départ de 0006 rend la lecture vérifiable : une liste vide
-- serait aussi le signe d'une policy qui filtre tout.
select isnt_empty(
  $$ select id from public.keep_alive limit 1 $$,
  'anon lit keep_alive, comme le ping'
);

select throws_ok(
  $$ insert into public.keep_alive (pinged_at) values (now()) $$, '42501', null,
  'anon ne peut pas écrire dans keep_alive'
);

select throws_ok(
  $$ truncate public.keep_alive $$, '42501', null,
  'anon ne peut pas vider keep_alive (la RLS ne couvre pas TRUNCATE)'
);

reset role;

select * from finish();
rollback;
