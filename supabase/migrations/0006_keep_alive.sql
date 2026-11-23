-- 0006 — la table du ping anti-pause.
--
-- POURQUOI ELLE EXISTE. Un projet Supabase Free se met en pause après sept
-- jours sans requête. Le workflow `supabase-keepalive.yml` fait donc chaque
-- jour un SELECT anonyme sur cette table pour remettre le compteur à zéro.
--
-- POURQUOI UNE MIGRATION, ET PLUS LE FICHIER À PART. Jusqu'au 23/11/2026, le
-- squelette livrait ce script dans `supabase/keep-alive.sql`, hors de
-- `migrations/`, « à appliquer une fois par projet » à la main, et le
-- générateur le rappelait en fin de création. Dans miss-bonus-quest, personne
-- ne l'a fait : au premier passage du keep-alive, PostgREST a répondu 404
-- (`PGRST205`, table inconnue). Un 404 se tranche sur le cache de schéma, sans
-- toucher à Postgres : le ping ne réveillait RIEN. En migration, la table naît
-- avec le reste du schéma, à la première poussée qui suit la pose des
-- secrets, et `supabase test db` la voit.
--
-- AUCUNE DONNÉE SENSIBLE : une identité et un horodatage.
--
-- Rejouable sans effet de bord : `if not exists`, `drop policy if exists`, et
-- un insert conditionnel. Un projet où la table a déjà été créée à la main
-- l'accepte donc tel quel.

create table if not exists public.keep_alive (
  id bigint generated always as identity primary key,
  pinged_at timestamptz not null default now()
);

-- RLS active, comme partout dans `public` (`structure-securite.test.sql`) :
-- tout est refusé par défaut, seule la policy ci-dessous rouvre la lecture.
alter table public.keep_alive enable row level security;

drop policy if exists "anon read keep_alive" on public.keep_alive;

create policy "anon read keep_alive" on public.keep_alive for select to anon
using (true);

-- DEUX VERROUS, PAS UN, comme `0003_rls.sql` : une policy filtre des LIGNES,
-- un privilège autorise la COMMANDE. Sans le `revoke`, `anon` garderait
-- INSERT, UPDATE, DELETE et TRUNCATE hérités par défaut, et la RLS ne couvre
-- pas TRUNCATE.
--
-- Le `grant` est indispensable pour un projet né après le 30/10/2026, date à
-- laquelle Supabase a cessé d'exposer d'office les tables neuves de `public`
-- (relevé de mister-molkky). Sans lui, le ping passerait de 404 à 401
-- (`42501`).
revoke all on table public.keep_alive from anon, authenticated;

grant select on table public.keep_alive to anon;

-- Une ligne de départ : le SELECT compterait comme activité même à vide, mais
-- une table peuplée rend le dernier ping lisible depuis le tableau de bord.
-- La condition, et non un `on conflict do nothing` qui ne déclenche jamais sur
-- une clé `identity`, est ce qui rend l'insert rejouable.
insert into public.keep_alive (pinged_at)
select now()
where not exists (select 1 from public.keep_alive);
