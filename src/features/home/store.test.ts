import { beforeEach, describe, expect, it } from 'vitest';
import { useNotes } from './store.ts';
import { notesStore } from '../../backend/local.ts';

/**
 * Ce que ce test fige, c'est le CONTRAT, pas l'implémentation : ce qui est
 * ajouté est relu après un rechargement, et ce qui est vide est refusé.
 *
 * Il éprouve du même coup le chemin complet — magasin d'écran, port, magasin
 * versionné, validation zod — sans rien simuler. C'est possible parce que le
 * backend a un repli local : un test n'a besoin d'aucune configuration.
 */
describe('le magasin de notes', () => {
  beforeEach(() => {
    localStorage.clear();
    notesStore.clear();
    useNotes.setState({ notes: [] });
  });

  it('ajoute une note, la plus récente en tête', () => {
    useNotes.getState().add('première');
    useNotes.getState().add('seconde');

    expect(useNotes.getState().notes.map(n => n.text)).toEqual([
      'seconde',
      'première',
    ]);
  });

  it('refuse une note vide ou faite d’espaces', () => {
    useNotes.getState().add('   ');
    useNotes.getState().add('');

    expect(useNotes.getState().notes).toHaveLength(0);
  });

  it('rend la note relisible après un rechargement', () => {
    useNotes.getState().add('ce qui survit');

    // Ce que verrait un démarrage à froid : le magasin est relu depuis zéro.
    expect(notesStore.load()?.notes.map(n => n.text)).toEqual([
      'ce qui survit',
    ]);
  });

  it('retire la note demandée, et elle seule', () => {
    useNotes.getState().add('à garder');
    useNotes.getState().add('à retirer');
    const cible = useNotes.getState().notes[0];
    expect(cible).toBeDefined();

    useNotes.getState().remove(cible!.id);

    expect(useNotes.getState().notes.map(n => n.text)).toEqual(['à garder']);
  });

  it('efface tout, magasin compris', () => {
    useNotes.getState().add('éphémère');
    useNotes.getState().clear();

    expect(useNotes.getState().notes).toEqual([]);
    expect(notesStore.load()?.notes ?? []).toEqual([]);
  });
});
