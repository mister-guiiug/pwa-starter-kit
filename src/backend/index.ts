import { createBackendSelector } from '@mister-guiiug/dev-pwa-config/backend';
import { createIdb } from '@mister-guiiug/dev-pwa-config/idb';
import { createLogger } from '@mister-guiiug/dev-pwa-config/logger';
import { createLocalBackend } from './local.ts';
import { createSupabaseNotes } from './supabase.ts';
import { createQueuedNotes, type QueuedNotes } from './queued-notes.ts';
import { createCachedNotes, type CachedNotes } from './cached-notes.ts';
import type { Backend } from './ports.ts';

const log = createLogger('backend');

/**
 * LA FILE D'ÉCRITURES HORS LIGNE, s'il y a un réseau à traverser.
 *
 * Elle n'existe qu'en mode distant : entre l'application et `localStorage`,
 * il n'y a pas de réseau à attendre. `null` en local, et l'écran d'accueil
 * n'affiche alors aucun indicateur — il n'a rien à dire.
 */
let file: QueuedNotes | null = null;

/**
 * LA COPIE DE LECTURE, même règle : il n'y a qu'en mode distant qu'une
 * lecture peut manquer de réseau. `null` en local — le magasin versionné EST
 * déjà la vérité, sur l'appareil.
 */
let lecture: CachedNotes | null = null;

/**
 * LE SÉLECTEUR DE BACKEND, DÉCLARÉ EN UNE FOIS.
 *
 * Trois règles, dans cet ordre : un choix explicite (`VITE_BACKEND`) gagne
 * toujours ; sinon la présence de toutes les variables requises décide ; sinon
 * on retombe sur le repli. Un choix explicite INCONNU est ignoré — mieux vaut
 * démarrer en local qu'échouer sur une faute de frappe dans un `.env`.
 *
 * **Le repli local n'est pas un détail.** Une app qui exige sa configuration
 * pour démarrer ne tourne ni hors ligne, ni en test, ni dans une CI sans
 * secrets, ni sur la page publique que quelqu'un ouvre sans compte.
 *
 * AJOUTER UN BACKEND DISTANT se fait ici, et seulement ici :
 *
 *     backends: {
 *       supabase: {
 *         requires: ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'],
 *         create: (env, base) => ({ notes: createSupabaseNotes(env, base) }),
 *       },
 *     }
 *
 * `create` rend un objet PARTIEL : les ports non fournis restent ceux du repli.
 * C'est ce qui permet de migrer une app en production port par port, sans
 * attendre que tous les adaptateurs soient écrits.
 */
const selectBackend = createBackendSelector<Backend>({
  fallback: createLocalBackend,
  backends: {
    supabase: {
      // Les deux clés que le socle nomme lui-même (`SUPABASE_ENV_KEYS`).
      // Absente l'une des deux, ce backend n'est pas retenu et l'application
      // s'ouvre en local — sans erreur, et en le disant dans les réglages.
      requires: ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'],
      // Un objet PARTIEL : seul le port `notes` est distant. Tout ce qui n'est
      // pas nommé ici reste servi par le repli. C'est ce qui permet de migrer
      // une application déjà en production, port par port.
      //
      // L'ADAPTATEUR EST ENVELOPPÉ, PAS MODIFIÉ — deux fois, et l'ordre compte.
      //
      //  - `createCachedNotes` au plus près du réseau : chaque lecture réussie
      //    est copiée dans IndexedDB, et resservie, datée, quand le réseau
      //    manque (ADR 0013). Les écritures qu'il voit passer sont celles que
      //    le serveur a ACCEPTÉES : ce sont elles qui retouchent la copie ;
      //  - `createQueuedNotes` par-dessus : la file du socle enfile les
      //    mutations et les rejoue au retour du réseau (ADR 0010), et pose ce
      //    qui attend encore sur ce que la lecture rend.
      //
      // L'adaptateur Supabase, lui, ignore les deux — il ne sait qu'écrire et
      // lire une ligne. La base IndexedDB porte le nom de l'application :
      // toutes les apps du parc partagent l'origine, donc l'espace de noms.
      create: () => {
        lecture = createCachedNotes(createSupabaseNotes(), {
          idb: createIdb('pwa-starter-kit-lecture'),
        });
        file = createQueuedNotes(lecture.notes);
        void file.start();
        return { notes: file.notes };
      },
    },
  },
  onFallback: ({ kind, missing, error }) => {
    log.warn('repli sur le backend local', { kind, missing, error });
  },
});

const selected = selectBackend(import.meta.env);

/** Le backend de l'application. */
export const backend = selected.backend;

/**
 * Où en est la migration : quels ports sont distants, lesquels sont restés
 * locaux. Une app à moitié migrée doit pouvoir le DIRE — c'est ce que l'écran
 * de réglages affiche, au lieu de laisser croire qu'un compte distant
 * fonctionne alors que tout est encore sur l'appareil.
 */
export const coverage = {
  kind: selected.kind,
  remote: selected.remote,
  local: selected.local,
};

/**
 * La file d'écritures du backend retenu, ou `null` quand il n'y a pas de
 * réseau à traverser. C'est ce que l'accueil observe pour dire « hors ligne »,
 * « N en attente » ou « refusée ».
 */
export const notesSync: QueuedNotes | null = file;

/**
 * La copie de lecture du backend retenu, ou `null` en local. L'accueil
 * l'observe pour dire « copie enregistrée il y a… » quand il en montre une.
 */
export const notesCache: CachedNotes | null = lecture;

/**
 * EFFACE LA COPIE DE LECTURE — appelé à la déconnexion (`SIGNED_OUT`) et à
 * l'effacement du compte. Sur un appareil partagé, le compte suivant ne doit
 * rien relire du précédent, même hors ligne. Sans backend distant, il n'y a
 * pas de copie : l'appel ne fait rien.
 *
 * LA FILE N'EST PAS VIDÉE ICI, et c'est délibéré : jeter des écritures en
 * attente sans prévenir est le défaut que l'audit du 05/11/2026 relève chez
 * deux applications. Les compter et le demander est une autre décision.
 */
export async function purgeReadCache(): Promise<void> {
  await lecture?.purge();
}

export type { Backend, Note, NotesSnapshot } from './ports.ts';
export { supabase } from './supabase.ts';
