import { describe, expect, it } from 'vitest';
import type { IdbStore } from '@mister-guiiug/dev-pwa-config/idb';
import { createCachedNotes } from './cached-notes.ts';
import type { Note, NotesRepository, NotesSnapshot } from './ports.ts';

/**
 * Ce que ces tests figent : HORS LIGNE, ON RELIT LE DERNIER ÉTAT CONNU — et
 * l'écran sait que c'en est une copie, datée.
 *
 * Avant le 05/11/2026, le modèle Supabase du squelette n'avait aucune copie :
 * son commentaire promettait que « le service worker répond », alors
 * qu'aucune règle de cache ne visait Supabase. Hors ligne, plus rien ne se
 * lisait — et chaque application engendrée héritait de la promesse.
 *
 * jsdom n'a pas d'IndexedDB : la base est une `Map`, au contrat de
 * `IdbStore` du socle — lire rend `undefined`, écrire rend `true`, rien ne
 * lève.
 */

function idbEnMemoire(): IdbStore & { valeurs: Map<string, unknown> } {
  const valeurs = new Map<string, unknown>();
  const store = {
    name: 'test-lecture',
    valeurs,
    available: async () => true,
    // Un clone, comme l'algorithme structuré : la copie ne partage rien
    // avec l'objet que l'application continue de modifier.
    get: async (key: string, fallback?: unknown) =>
      valeurs.has(key) ? structuredClone(valeurs.get(key)) : fallback,
    set: async (key: string, value: unknown) => {
      valeurs.set(key, structuredClone(value));
      return true;
    },
    remove: async (key: string) => valeurs.delete(key),
    keys: async () => [...valeurs.keys()],
    clear: async () => {
      valeurs.clear();
      return true;
    },
    getBlob: async () => undefined,
    setBlob: async () => false,
    removeBlob: async () => false,
    close: async () => {},
  };
  return store as IdbStore & { valeurs: Map<string, unknown> };
}

const note = (id: string): Note => ({
  id,
  text: id,
  createdAt: '2026-11-05T08:00:00.000Z',
});

/** Un serveur de comptoir : il répond, ou il tombe de la façon qu'on lui dit. */
function serveur() {
  let notes: Note[] = [note('note_1')];
  let panne: Error | null = null;
  let suspendre = false;
  let relache: (() => void) | null = null;
  const repondre = async (): Promise<void> => {
    if (panne) throw panne;
  };
  return {
    tomber(erreur: Error | null) {
      panne = erreur;
    },
    /** La prochaine lecture reste pendante jusqu'à `relacher()`. */
    suspendre() {
      suspendre = true;
    },
    relacher: () => relache?.(),
    repository: {
      load: async (): Promise<NotesSnapshot> => {
        if (suspendre) {
          suspendre = false;
          await new Promise<void>(resolve => {
            relache = resolve;
          });
        }
        await repondre();
        return { notes: [...notes] };
      },
      add: async (n: Note) => {
        await repondre();
        notes = [n, ...notes];
      },
      remove: async (id: string) => {
        await repondre();
        notes = notes.filter(n => n.id !== id);
      },
      clear: async () => {
        await repondre();
        notes = [];
      },
      export: async () => null,
      import: async (): Promise<NotesSnapshot> => {
        await repondre();
        notes = [note('note_importee')];
        return { notes: [...notes] };
      },
    } satisfies NotesRepository,
  };
}

const COUPURE = new TypeError('Failed to fetch');
const MATIN = new Date('2026-11-05T09:00:00.000Z');

function lectureSur(
  depot: NotesRepository,
  idb = idbEnMemoire(),
  enLigne = () => true
) {
  return {
    idb,
    cache: createCachedNotes(depot, {
      idb,
      isOnline: enLigne,
      now: () => MATIN,
    }),
  };
}

describe('la lecture du dernier état connu', () => {
  it('copie chaque lecture réussie, et la ressert quand le réseau tombe — datée', async () => {
    const distant = serveur();
    const { cache } = lectureSur(distant.repository);

    expect((await cache.notes.load()).notes.map(n => n.id)).toEqual(['note_1']);
    expect(cache.getSnapshot().staleAt).toBeNull();

    distant.tomber(COUPURE);
    expect((await cache.notes.load()).notes.map(n => n.id)).toEqual(['note_1']);
    // L'écran SAIT qu'il montre une copie, et de quand elle date.
    expect(cache.getSnapshot().staleAt).toBe(MATIN.toISOString());

    // Le réseau revient : la lecture redevient fraîche, l'avertissement part.
    distant.tomber(null);
    await cache.notes.load();
    expect(cache.getSnapshot().staleAt).toBeNull();
  });

  it('ressert la copie dès que l’appareil se dit hors ligne, quelle que soit l’erreur', async () => {
    const distant = serveur();
    let enLigne = true;
    const { cache } = lectureSur(distant.repository, undefined, () => enLigne);
    await cache.notes.load();

    enLigne = false;
    distant.tomber(new Error('erreur que le SDK n’a pas su nommer'));
    expect((await cache.notes.load()).notes).toHaveLength(1);
  });

  it('ne masque PAS un refus du serveur derrière une copie', async () => {
    // La copie répond à « pas de réseau », et à rien d'autre. Un refus de la
    // RLS servi en copie ferait croire que tout va bien.
    const distant = serveur();
    const { cache } = lectureSur(distant.repository);
    await cache.notes.load();

    distant.tomber(new Error('permission denied for table notes'));
    await expect(cache.notes.load()).rejects.toThrow(/permission denied/);
    expect(cache.getSnapshot().staleAt).toBeNull();
  });

  it('sans copie, l’erreur réseau remonte telle quelle', async () => {
    const distant = serveur();
    distant.tomber(COUPURE);
    const { cache } = lectureSur(distant.repository);
    await expect(cache.notes.load()).rejects.toBe(COUPURE);
  });

  it('écarte une copie que le schéma refuse — écrite par une autre version', async () => {
    const distant = serveur();
    const { cache, idb } = lectureSur(distant.repository);
    await cache.notes.load();

    // La forme d'une version future : la copie n'est plus un `NotesSnapshot`.
    const [cle] = await idb.keys();
    await idb.set(cle!, { at: MATIN.toISOString(), data: { items: [] } });

    distant.tomber(COUPURE);
    await expect(cache.notes.load()).rejects.toBe(COUPURE);
  });

  it('tient la copie à jour des écritures que le serveur a acceptées', async () => {
    // Sans cette retouche, une note écrite APRÈS la dernière lecture — et bien
    // arrivée — disparaîtrait au rechargement hors ligne.
    const distant = serveur();
    const { cache } = lectureSur(distant.repository);
    await cache.notes.load();

    await cache.notes.add(note('note_2'));
    await cache.notes.remove('note_1');

    distant.tomber(COUPURE);
    expect((await cache.notes.load()).notes.map(n => n.id)).toEqual(['note_2']);
  });

  it('ne retouche rien quand l’écriture échoue', async () => {
    const distant = serveur();
    const { cache } = lectureSur(distant.repository);
    await cache.notes.load();

    distant.tomber(COUPURE);
    await expect(cache.notes.add(note('note_refusee'))).rejects.toBe(COUPURE);
    expect((await cache.notes.load()).notes.map(n => n.id)).toEqual(['note_1']);
  });

  it('se purge — et une lecture partie avant la purge ne la réécrit pas', async () => {
    // L'APPAREIL PARTAGÉ : après la déconnexion, le compte suivant ne doit
    // rien relire du précédent, même hors ligne.
    const distant = serveur();
    const { cache, idb } = lectureSur(distant.repository);
    await cache.notes.load();

    // Une lecture part avec le jeton de l'ancien compte…
    distant.suspendre();
    const enVol = cache.notes.load();
    // …la déconnexion purge pendant qu'elle est en route…
    await cache.purge();
    distant.relacher();
    await enVol;

    // …et sa réponse, arrivée trop tard, n'est pas recopiée.
    expect(idb.valeurs.size).toBe(0);
    distant.tomber(COUPURE);
    await expect(cache.notes.load()).rejects.toBe(COUPURE);
    expect(cache.getSnapshot().staleAt).toBeNull();
  });

  it('la purge efface aussi l’avertissement « copie datée »', async () => {
    const distant = serveur();
    const { cache } = lectureSur(distant.repository);
    await cache.notes.load();
    distant.tomber(COUPURE);
    await cache.notes.load();
    expect(cache.getSnapshot().staleAt).not.toBeNull();

    await cache.purge();
    expect(cache.getSnapshot().staleAt).toBeNull();
  });

  it('un import et un effacement réécrivent la copie entière', async () => {
    const distant = serveur();
    const { cache } = lectureSur(distant.repository);
    await cache.notes.load();

    await cache.notes.import('{}');
    distant.tomber(COUPURE);
    expect((await cache.notes.load()).notes.map(n => n.id)).toEqual([
      'note_importee',
    ]);

    distant.tomber(null);
    await cache.notes.clear();
    distant.tomber(COUPURE);
    expect((await cache.notes.load()).notes).toEqual([]);
  });

  it('l’instantané est STABLE tant que rien ne change', async () => {
    // `useSyncExternalStore` compare par identité : un objet neuf à chaque
    // lecture ferait boucler le rendu.
    const distant = serveur();
    const { cache } = lectureSur(distant.repository);
    const avant = cache.getSnapshot();
    await cache.notes.load();
    expect(cache.getSnapshot()).toBe(avant);
  });
});
