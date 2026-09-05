import { createSupabaseClientFactory } from '@mister-guiiug/dev-pwa-config/supabase-client';
import { createLogger } from '@mister-guiiug/dev-pwa-config/logger';
import { notesSchema, type Backend, type NotesSnapshot } from './ports.ts';

const log = createLogger('supabase');

/**
 * LA FABRIQUE DU SOCLE, PAS UN `createClient` EN HAUT DE FICHIER.
 *
 * Elle est **paresseuse** : `@supabase/supabase-js` n'est chargé qu'au premier
 * appel réel. Une application configurée mais dont personne n'ouvre le compte
 * ne paie donc pas les cinquante kilo-octets du SDK au premier rendu — c'est
 * ce que faisait une app du parc, qui préchargeait Supabase avant même l'écran
 * d'accueil.
 *
 * Elle sait aussi dire ce qui manque (`missing()`) plutôt que d'échouer sur un
 * `undefined`, et c'est ce que l'écran de réglages affiche.
 */
export const supabase = createSupabaseClientFactory<SupabaseLike>();

/** Le strict nécessaire du client, pour ne pas figer une version du SDK. */
interface SupabaseLike {
  auth: { getUser(): Promise<{ data: { user: { id: string } | null } }> };
  from(table: string): {
    select(columns: string): {
      order(
        column: string,
        options: { ascending: boolean }
      ): Promise<{ data: unknown[] | null; error: { message: string } | null }>;
    };
    delete(): {
      eq(
        column: string,
        value: string
      ): Promise<{ error: { message: string } | null }>;
    };
    insert(rows: unknown[]): Promise<{ error: { message: string } | null }>;
  };
}

/**
 * L'adaptateur des notes. Il ne remplace QUE ce port : tout le reste du
 * backend continue de venir du repli local, et c'est ce que
 * `createBackendSelector` compose.
 *
 * LA RLS FAIT LE FILTRAGE, PAS CE CODE. Aucune requête ne porte de
 * `where user_id = …` : les politiques de `0003_rls.sql` restreignent déjà les
 * lignes au propriétaire. Filtrer ici en plus donnerait l'illusion que la
 * sécurité vient du client — elle vient de la base, et elle doit rester
 * vérifiable sans lire le front.
 */
export function createSupabaseNotes(): Backend['notes'] {
  const client = () => supabase.getClient();

  return {
    async load() {
      const db = await client();
      const { data, error } = await db
        .from('notes')
        .select('id, text, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        // Remonter l'erreur plutôt que rendre une liste vide : une lecture qui
        // échoue et une liste réellement vide ne se traitent pas pareil.
        log.error('lecture des notes', { message: error.message });
        throw new Error(error.message);
      }

      // Validé comme le local : ce qui vient du réseau n'est pas plus sûr que
      // ce qui vient du disque.
      return notesSchema.parse({
        notes: (data ?? []).map(row => {
          const r = row as { id: string; text: string; created_at: string };
          return { id: r.id, text: r.text, createdAt: r.created_at };
        }),
      });
    },

    /**
     * Remplace l'instantané : le magasin d'écran raisonne en listes, pas en
     * mutations. C'est acceptable pour quelques dizaines de notes ; au-delà,
     * le port devrait exposer `add`/`remove` et non `save`. La limite est
     * écrite ici pour qu'on la voie avant de la franchir.
     */
    async save(snapshot: NotesSnapshot) {
      const db = await client();
      const {
        data: { user },
      } = await db.auth.getUser();
      if (!user) throw new Error('écriture sans session');

      const { error: cleared } = await db
        .from('notes')
        .delete()
        .eq('user_id', user.id);
      if (cleared) throw new Error(cleared.message);

      if (snapshot.notes.length === 0) return;
      const { error } = await db.from('notes').insert(
        snapshot.notes.map(note => ({
          id: note.id,
          user_id: user.id,
          text: note.text,
          created_at: note.createdAt,
        }))
      );
      if (error) throw new Error(error.message);
    },

    async clear() {
      const db = await client();
      const {
        data: { user },
      } = await db.auth.getUser();
      if (!user) return;
      const { error } = await db.from('notes').delete().eq('user_id', user.id);
      if (error) throw new Error(error.message);
    },

    async export() {
      const snapshot = await this.load();
      return JSON.stringify(snapshot, null, 2);
    },
  };
}
