import { z } from 'zod';

/**
 * Le modèle, décrit par un schéma dont le type est DÉRIVÉ.
 *
 * Le schéma sert deux fois : il type le code, et il valide ce qui remonte du
 * stockage — une donnée écrite par une version antérieure, ou par une autre
 * main. Écrire l'interface d'un côté et la validation de l'autre, c'est
 * s'engager à les garder d'accord.
 */
export const noteSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1).max(2000),
  createdAt: z.string(),
});

export type Note = z.infer<typeof noteSchema>;

export const notesSchema = z.object({
  notes: z.array(noteSchema),
});

export type NotesSnapshot = z.infer<typeof notesSchema>;

/**
 * LE PORT, et rien d'autre.
 *
 * Un port décrit ce dont l'application a besoin, pas ce qu'un fournisseur sait
 * faire. C'est ce qui permet de remplacer les adaptateurs UN PAR UN — d'avoir
 * Supabase pour les notes et le local pour le reste, en production, sans big
 * bang. `composeBackend` du socle existe pour cette manœuvre exacte.
 *
 * TOUT EST ASYNCHRONE, MÊME CE QUI NE L'EST PAS EN LOCAL.
 *
 * La première version de ce port était synchrone : `load(): NotesSnapshot`.
 * C'était l'implémentation locale — `localStorage`, donc synchrone — dessinée
 * en interface. Elle rendait le port **inimplémentable par un adaptateur
 * distant**, ce qui n'est apparu qu'en écrivant celui de Supabase. Un port
 * dessiné sur une seule implémentation n'est pas un port : c'est cette
 * implémentation, avec un autre nom.
 *
 * Le prix est réel — l'écran doit gérer un état de chargement même en local,
 * où il n'y en a pas — et il est plus faible que celui de la découverte
 * tardive : à ce moment-là, ce sont les écrans qu'il faut reprendre.
 */
export interface NotesRepository {
  load(): Promise<NotesSnapshot>;
  save(snapshot: NotesSnapshot): Promise<void>;
  clear(): Promise<void>;
  /** L'état courant en JSON, pour l'export de l'écran de réglages. */
  export(): Promise<string | null>;
}

export interface Backend {
  notes: NotesRepository;
}
