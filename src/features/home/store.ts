import { create } from 'zustand';
import { createId } from '@mister-guiiug/dev-pwa-config/id';
import { createLogger } from '@mister-guiiug/dev-pwa-config/logger';
import { backend } from '../../backend/index.ts';
import type { Note } from '../../backend/ports.ts';

const log = createLogger('notes');

interface NotesState {
  notes: Note[];
  /** `false` tant que la première lecture n'a pas rendu. */
  ready: boolean;
  /** La dernière écriture a échoué : l'écran doit pouvoir le dire. */
  error: string | null;
  load: () => Promise<void>;
  add: (text: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clear: () => Promise<void>;
}

/**
 * Le magasin d'écran : Zustand pour l'état vivant, le PORT pour ce qui
 * survit. La persistance n'est pas dans le magasin, ce qui rend la migration
 * vers un backend distant possible sans toucher à ce fichier.
 *
 * ÉCRITURE OPTIMISTE, ET REPRISE EN CAS D'ÉCHEC. L'état change d'abord, on
 * écrit ensuite ; si l'écriture échoue, l'état d'AVANT est restauré et
 * l'erreur est portée. Le contraire — attendre le serveur pour afficher —
 * rendrait l'application local-first inutilement lente, puisque son écriture
 * est instantanée.
 *
 * `createId` vient du socle : quatre applications avaient chacune leur
 * générateur, pour environ deux cent cinquante sites d'appel.
 */
async function persist(
  notes: Note[],
  precedent: Note[],
  set: (partial: Partial<NotesState>) => void
) {
  try {
    await backend.notes.save({ notes });
    set({ error: null });
  } catch (cause) {
    log.error('écriture des notes', { cause });
    set({
      notes: precedent,
      error: cause instanceof Error ? cause.message : String(cause),
    });
  }
}

export const useNotes = create<NotesState>((set, get) => ({
  notes: [],
  ready: false,
  error: null,

  async load() {
    try {
      const snapshot = await backend.notes.load();
      set({ notes: snapshot.notes, ready: true, error: null });
    } catch (cause) {
      log.error('lecture des notes', { cause });
      set({
        ready: true,
        error: cause instanceof Error ? cause.message : String(cause),
      });
    }
  },

  async add(text) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const precedent = get().notes;
    const note: Note = {
      id: createId('note'),
      text: trimmed,
      createdAt: new Date().toISOString(),
    };
    // La plus récente en tête : c'est celle qu'on vient d'écrire.
    const notes = [note, ...precedent];
    set({ notes });
    await persist(notes, precedent, set);
  },

  async remove(id) {
    const precedent = get().notes;
    const notes = precedent.filter(n => n.id !== id);
    set({ notes });
    await persist(notes, precedent, set);
  },

  async clear() {
    const precedent = get().notes;
    set({ notes: [] });
    try {
      await backend.notes.clear();
      set({ error: null });
    } catch (cause) {
      log.error('effacement des notes', { cause });
      set({
        notes: precedent,
        error: cause instanceof Error ? cause.message : String(cause),
      });
    }
  },
}));
