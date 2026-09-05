import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useNotes } from './store.ts';
import { notesStore } from '../../backend/local.ts';
import { backend } from '../../backend/index.ts';

/**
 * Ce que ces tests figent, c'est le CONTRAT : ce qui est ajouté se relit après
 * un rechargement, ce qui est vide est refusé, et une écriture qui échoue
 * REND L'ÉTAT D'AVANT au lieu de laisser l'écran mentir.
 *
 * Le chemin complet est éprouvé sans rien simuler — magasin d'écran, port,
 * magasin versionné, validation zod. C'est possible parce que le backend a un
 * repli local : un test n'a besoin d'aucune configuration.
 */
describe('le magasin de notes', () => {
  beforeEach(async () => {
    localStorage.clear();
    notesStore.clear();
    useNotes.setState({ notes: [], ready: false, error: null });
  });

  it('ajoute une note, la plus récente en tête', async () => {
    await useNotes.getState().add('première');
    await useNotes.getState().add('seconde');

    expect(useNotes.getState().notes.map(n => n.text)).toEqual([
      'seconde',
      'première',
    ]);
  });

  it('refuse une note vide ou faite d’espaces', async () => {
    await useNotes.getState().add('   ');
    await useNotes.getState().add('');

    expect(useNotes.getState().notes).toHaveLength(0);
  });

  it('rend la note relisible après un rechargement', async () => {
    await useNotes.getState().add('ce qui survit');

    // Ce que verrait un démarrage à froid : l'état est vidé, puis rechargé
    // depuis le port, comme au montage de l'application.
    useNotes.setState({ notes: [], ready: false });
    await useNotes.getState().load();

    expect(useNotes.getState().notes.map(n => n.text)).toEqual([
      'ce qui survit',
    ]);
    expect(useNotes.getState().ready).toBe(true);
  });

  it('retire la note demandée, et elle seule', async () => {
    await useNotes.getState().add('à garder');
    await useNotes.getState().add('à retirer');
    const cible = useNotes.getState().notes[0];
    expect(cible).toBeDefined();

    await useNotes.getState().remove(cible!.id);

    expect(useNotes.getState().notes.map(n => n.text)).toEqual(['à garder']);
  });

  it('efface tout, magasin compris', async () => {
    await useNotes.getState().add('éphémère');
    await useNotes.getState().clear();

    expect(useNotes.getState().notes).toEqual([]);
    expect((await backend.notes.load()).notes).toEqual([]);
  });

  it('restaure l’état d’avant quand l’écriture échoue', async () => {
    await useNotes.getState().add('déjà là');
    const avant = useNotes.getState().notes;

    // Une écriture distante peut échouer — réseau, RLS, session expirée. Ce
    // que l'écran ne doit JAMAIS faire, c'est afficher une note que la base
    // n'a pas acceptée.
    const echec = vi
      .spyOn(backend.notes, 'save')
      .mockRejectedValueOnce(new Error('refus de la base'));

    await useNotes.getState().add('jamais écrite');

    expect(useNotes.getState().notes).toEqual(avant);
    expect(useNotes.getState().error).toBe('refus de la base');
    echec.mockRestore();
  });
});
