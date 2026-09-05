import { create } from 'zustand';
import { createId } from '@mister-guiiug/dev-pwa-config/id';
import { backend } from '../../backend/index.ts';
import type { Note } from '../../backend/ports.ts';

interface NotesState {
  notes: Note[];
  add: (text: string) => void;
  remove: (id: string) => void;
  clear: () => void;
}

/**
 * Le magasin d'écran : Zustand pour l'état vivant, le PORT pour ce qui
 * survit au rechargement.
 *
 * La persistance n'est pas dans le magasin : elle est derrière
 * `backend.notes`, ce qui rend la migration vers un backend distant possible
 * sans toucher à ce fichier — et rend ce magasin testable sans stockage.
 *
 * `createId` vient du socle. Quatre apps avaient chacune leur générateur
 * d'identifiants, pour environ deux cent cinquante sites d'appel, et le socle
 * lui-même en portait deux copies internes avant que le module n'existe.
 */
function persist(notes: Note[]): Note[] {
  backend.notes.save({ notes });
  return notes;
}

export const useNotes = create<NotesState>(set => ({
  notes: backend.notes.load().notes,

  add: text =>
    set(state => {
      const trimmed = text.trim();
      if (!trimmed) return state;
      const note: Note = {
        id: createId('note'),
        text: trimmed,
        createdAt: new Date().toISOString(),
      };
      // La plus récente en tête : c'est celle qu'on vient d'écrire.
      return { notes: persist([note, ...state.notes]) };
    }),

  remove: id =>
    set(state => ({ notes: persist(state.notes.filter(n => n.id !== id)) })),

  clear: () =>
    set(() => {
      backend.notes.clear();
      return { notes: [] };
    }),
}));
