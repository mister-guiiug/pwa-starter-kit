import type { IdbStore } from '@mister-guiiug/dev-pwa-config/idb';
import { classifyBackendError } from '@mister-guiiug/dev-pwa-config/backend';
import { createLogger } from '@mister-guiiug/dev-pwa-config/logger';
import {
  notesSchema,
  type Note,
  type NotesRepository,
  type NotesSnapshot,
} from './ports.ts';

const log = createLogger('lecture');

/** Ce que l'écran doit savoir de la dernière lecture. */
export interface ReadSnapshot {
  /**
   * La date (ISO) de la copie que l'écran montre, ou `null` quand la dernière
   * lecture vient du serveur. C'est elle qui fait dire « copie enregistrée il
   * y a deux heures » au lieu de laisser croire que c'est l'état du moment.
   */
  staleAt: string | null;
}

export interface CachedNotes {
  /** Le port, inchangé de l'extérieur — comme la file qui l'enveloppe. */
  notes: NotesRepository;
  /** `useSyncExternalStore` : l'abonnement et l'instantané STABLE. */
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => ReadSnapshot;
  /** Efface la copie — à la déconnexion, et à l'effacement du compte. */
  purge: () => Promise<void>;
}

export interface CachedNotesOptions {
  /** La base du socle (`createIdb`), au nom de l'application. */
  idb: IdbStore;
  /** Défaut : `navigator.onLine !== false`. Injectable (tests). */
  isOnline?: () => boolean;
  /** L'horloge qui date la copie. Injectable (tests). */
  now?: () => Date;
}

/** La copie telle qu'elle dort dans IndexedDB : sa date, et la donnée brute. */
interface Copie {
  at: string;
  data: unknown;
}

const CLE = 'notes';

function messageOf(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

/**
 * LIRE HORS LIGNE — le dernier état connu, derrière le port (ADR 0013).
 *
 * Chaque lecture réussie est COPIÉE dans IndexedDB, avec sa date. Quand le
 * réseau manque, et seulement alors, la copie est resservie, REVALIDÉE par le
 * schéma du port : une copie écrite par une autre version de l'application ne
 * passe pas, et l'erreur d'origine remonte à sa place. L'instantané dit que
 * l'écran lit une copie, et de quand.
 *
 * POURQUOI PAS LE SERVICE WORKER. Le socle n'en met AUCUNE réponse d'API en
 * cache par défaut (`apiOrigins` vide), et il a raison : Workbox range les
 * réponses par URL, sans tenir compte de l'en-tête `Authorization`. Sur un
 * appareil partagé, le compte suivant relirait hors ligne les notes du
 * précédent. Une copie tenue par l'application se purge à la déconnexion ;
 * un cache du worker, l'application ne le voit pas.
 *
 * CE QUI DÉCLENCHE LA COPIE, ET RIEN D'AUTRE : une coupure. L'appareil se dit
 * hors ligne, ou le SDK rend une erreur que le socle classe « réseau ». Un
 * refus de la RLS servi en copie ferait croire que tout va bien.
 *
 * LES ÉCRITURES ACCEPTÉES RETOUCHENT LA COPIE. Sans elles, une note écrite
 * après la dernière lecture — et bien arrivée — disparaîtrait au rechargement
 * hors ligne. La date de la copie, elle, ne bouge pas : elle reste celle de la
 * dernière liste COMPLÈTE lue sur le serveur, ce qu'un autre appareil a pu
 * changer depuis ne s'y voit pas.
 *
 * Les écritures EN ATTENTE ne sont pas ici : elles vivent dans la file
 * (`queued-notes.ts`), qui les pose par-dessus ce que cette lecture rend.
 */
export function createCachedNotes(
  inner: NotesRepository,
  options: CachedNotesOptions
): CachedNotes {
  const {
    idb,
    isOnline = () => globalThis.navigator?.onLine !== false,
    now = () => new Date(),
  } = options;

  // Même règle que la file : un objet MÉMORISÉ, remplacé seulement quand il
  // change. `useSyncExternalStore` compare par identité.
  let snapshot: ReadSnapshot = { staleAt: null };
  const listeners = new Set<() => void>();
  function publish(staleAt: string | null) {
    if (snapshot.staleAt === staleAt) return;
    snapshot = { staleAt };
    for (const listener of listeners) listener();
  }

  /**
   * LA GÉNÉRATION, contre la lecture arrivée après la purge. Une requête
   * partie avec le jeton du compte précédent peut répondre APRÈS la
   * déconnexion : la recopier remettrait ses notes sur l'appareil. Chaque
   * écriture de la copie vérifie qu'aucune purge n'est passée depuis son
   * départ.
   */
  let generation = 0;

  /** Les écritures de la copie, EN SÉRIE : une relecture-réécriture à la fois. */
  let chaine: Promise<unknown> = Promise.resolve();
  function enSerie(travail: () => Promise<unknown>): Promise<unknown> {
    chaine = chaine.then(travail, travail);
    return chaine;
  }

  const coupure = (cause: unknown) =>
    !isOnline() || classifyBackendError(messageOf(cause)) === 'network';

  async function lireCopie(): Promise<{
    at: string;
    notes: NotesSnapshot;
  } | null> {
    const copie = await idb.get<Copie>(CLE);
    if (!copie || typeof copie.at !== 'string') return null;
    const valide = notesSchema.safeParse(copie.data);
    if (!valide.success) {
      log.warn('copie de lecture refusée par le schéma, écartée');
      return null;
    }
    return { at: copie.at, notes: valide.data };
  }

  /** Remplace la copie entière : ce que le serveur vient de dire, daté. */
  function copier(depart: number, data: NotesSnapshot) {
    return enSerie(async () => {
      if (depart !== generation) return;
      await idb.set(CLE, { at: now().toISOString(), data } satisfies Copie);
    });
  }

  /**
   * Retouche la copie après une écriture acceptée. Sans copie, rien : une
   * liste partielle se ferait passer pour complète au prochain hors-ligne.
   */
  function retoucher(
    depart: number,
    changer: (notes: Note[]) => Note[]
  ): Promise<unknown> {
    return enSerie(async () => {
      if (depart !== generation) return;
      const copie = await lireCopie();
      if (!copie || depart !== generation) return;
      await idb.set(CLE, {
        at: copie.at,
        data: { notes: changer(copie.notes.notes) },
      } satisfies Copie);
    });
  }

  const notes: NotesRepository = {
    async load() {
      const depart = generation;
      try {
        const frais = await inner.load();
        await copier(depart, frais);
        if (depart === generation) publish(null);
        return frais;
      } catch (cause) {
        if (!coupure(cause)) throw cause;
        const copie = await lireCopie();
        if (!copie) throw cause;
        publish(copie.at);
        return copie.notes;
      }
    },

    async add(note) {
      const depart = generation;
      await inner.add(note);
      await retoucher(depart, liste => [
        note,
        ...liste.filter(n => n.id !== note.id),
      ]);
    },

    async remove(id) {
      const depart = generation;
      await inner.remove(id);
      await retoucher(depart, liste => liste.filter(n => n.id !== id));
    },

    // `clear` et `import` REMPLACENT TOUT : leur résultat est la liste
    // complète du serveur, à l'instant — une copie fraîche, pas une retouche.
    async clear() {
      const depart = generation;
      await inner.clear();
      await copier(depart, { notes: [] });
    },

    async import(json) {
      const depart = generation;
      const retenu = await inner.import(json);
      await copier(depart, retenu);
      return retenu;
    },

    // L'export lit le serveur, pas la copie : un fichier qui sort de
    // l'application ne doit pas être un état périmé sans le dire.
    export: () => inner.export(),
  };

  return {
    notes,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,
    async purge() {
      generation += 1;
      publish(null);
      await enSerie(() => idb.clear());
    },
  };
}
