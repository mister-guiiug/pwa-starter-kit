import { createVersionedStore } from '@mister-guiiug/dev-pwa-config/versioned-store';
import { notesSchema, type Backend, type NotesSnapshot } from './ports.ts';

/**
 * L'adaptateur local : `versioned-store` du socle, pas `localStorage` nu.
 *
 * La différence tient en une garantie : ce magasin enveloppe la donnée dans
 * `{ v, data }`, applique une chaîne de migrations qui montent d'un cran, et
 * **copie de côté avant toute perte possible** — donnée illisible, version
 * venue du futur, schéma refusé. Sept apps du parc avaient chacune leur
 * `storage.ts` maison ; aucune n'avait cette copie de sauvegarde, et c'est
 * exactement ce qui manque le jour où un utilisateur ouvre une version
 * antérieure de l'app.
 *
 * `validate` reçoit le schéma zod de l'application : le socle ne dépend
 * d'aucun validateur, il appelle celui qu'on lui donne.
 */
export const notesStore = createVersionedStore<NotesSnapshot>({
  store: 'pwa-starter-kit',
  key: 'notes',
  version: 1,
  validate: data => notesSchema.parse(data),
  seed: () => ({ notes: [] }),

  // Aucune migration pour l'instant : la version 1 est la première. Le jour où
  // le modèle change, `migrations[1]` transforme la donnée de la v1 vers la v2
  // — et le magasin, lui, tient le compte.
  migrations: {},
});

export function createLocalBackend(): Backend {
  return {
    notes: {
      load: () => notesStore.load(),
      save: snapshot => {
        notesStore.save(snapshot);
      },
      clear: () => {
        notesStore.clear();
      },
      export: () => notesStore.export(),
    },
  };
}
