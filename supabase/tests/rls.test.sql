-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ Isolation entre comptes — pgTAP. Lancement : `supabase test db`.         ║
-- ║                                                                          ║
-- ║ CE QUE CES TESTS PROUVENT, et qu'une relecture de politiques ne prouve   ║
-- ║ pas : deux comptes ne se voient pas, `anon` ne voit rien, et personne    ║
-- ║ ne peut s'attribuer un rôle ni écrire au nom d'un autre.                 ║
-- ║                                                                          ║
-- ║ Une politique se lit vite et se trompe de même. La RLS est le seul       ║
-- ║ endroit du système où une erreur d'une ligne expose toute une table à    ║
-- ║ une clé publique — elle mérite d'être exécutée, pas relue.               ║
-- ║                                                                          ║
-- ║ `set local role authenticated` + `request.jwt.claims` : c'est ainsi      ║
-- ║ qu'on se fait passer pour un utilisateur donné. Sans le rôle, la session ║
-- ║ garde `bypassrls` et TOUT passe — le test serait vert et faux.           ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

begin;
select plan(13);

-- ── Décor : deux comptes, une note chacun, et Bob administrateur ─────────

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@exemple.test'),
  ('22222222-2222-2222-2222-222222222222', 'bob@exemple.test');

-- Le rôle se pose par le serveur (ici : la session de test, sous `postgres`),
-- jamais par une requête du client — c'est ce que vérifie le § « Ce qu'elle
-- ne peut pas faire ».
insert into user_roles (user_id, role)
values ('22222222-2222-2222-2222-222222222222', 'admin');

-- ── Le rôle arrive DANS le jeton, par le hook ─────────────────────────────
--
-- `useRole()` lit `app_metadata.roles` ; jusqu'au 05/09/2026 rien ne l'y
-- écrivait, et le badge admin ne pouvait jamais s'afficher. Le hook de 0004
-- est appelé par GoTrue à chaque émission ; on l'appelle ici tel quel.

select is(
  (select custom_access_token_hook(
     '{"user_id":"22222222-2222-2222-2222-222222222222","claims":{"app_metadata":{"provider":"email"}}}'::jsonb
   ) -> 'claims' -> 'app_metadata' -> 'roles'),
  '["admin"]'::jsonb,
  'le hook recopie le rôle de Bob dans le jeton, sans écraser le reste d’app_metadata'
);

select is(
  (select custom_access_token_hook(
     '{"user_id":"11111111-1111-1111-1111-111111111111","claims":{}}'::jsonb
   ) -> 'claims' -> 'app_metadata' -> 'roles'),
  '[]'::jsonb,
  'sans rôle, un tableau vide — jamais une absence à interpréter'
);

-- Le déclencheur `handle_new_user` a créé les deux profils.
select is(
  (select count(*)::int from profiles
   where id in ('11111111-1111-1111-1111-111111111111',
                '22222222-2222-2222-2222-222222222222')),
  2,
  'le profil naît avec le compte, sans requête du client'
);

insert into notes (id, user_id, text) values
  ('note_alice', '11111111-1111-1111-1111-111111111111', 'à Alice'),
  ('note_bob', '22222222-2222-2222-2222-222222222222', 'à Bob');

-- ── `anon` ne voit rien ───────────────────────────────────────────────────

set local role anon;

select is((select count(*)::int from notes), 0, 'anon ne lit aucune note');
select is((select count(*)::int from profiles), 0, 'anon ne lit aucun profil');
select is((select count(*)::int from user_roles), 0, 'anon ne lit aucun rôle');

-- ── Alice ne voit qu'elle ─────────────────────────────────────────────────

reset role;
set local role authenticated;
set local request.jwt.claims to
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is(
  (select count(*)::int from notes),
  1,
  'un compte ne voit que ses propres notes'
);
select is(
  (select text from notes),
  'à Alice',
  'et ce sont bien les siennes'
);
select is(
  (select count(*)::int from profiles),
  1,
  'un compte ne voit que son propre profil'
);

-- ── Ce qu'elle ne peut pas faire ──────────────────────────────────────────

select throws_ok(
  $$ insert into notes (id, user_id, text)
     values ('usurpee', '22222222-2222-2222-2222-222222222222', 'au nom de Bob') $$,
  '42501',
  null,
  'écrire au nom d’un autre est refusé par la base'
);

select throws_ok(
  $$ insert into user_roles (user_id, role)
     values ('11111111-1111-1111-1111-111111111111', 'admin') $$,
  '42501',
  null,
  's’attribuer un rôle est impossible depuis le navigateur'
);

select is(
  (select count(*)::int from notes
   where id = 'note_bob'),
  0,
  'la note d’un autre reste invisible, même nommée'
);

-- Supprimer la note d'un autre ne lève pas : la RLS la rend simplement
-- invisible, donc la suppression ne trouve rien. C'est le comportement
-- attendu, et il vaut d'être figé : un test qui attendrait une erreur ici
-- échouerait sans qu'aucune faille n'existe.
delete from notes where id = 'note_bob';
reset role;
select is(
  (select count(*)::int from notes where id = 'note_bob'),
  1,
  'la note d’un autre survit à une tentative de suppression'
);

select * from finish();
rollback;
