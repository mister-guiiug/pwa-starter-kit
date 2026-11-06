import { describe, expect, it } from 'vitest';
import {
  notesStoreOptions,
  parseNotesFile,
  stringifyNotesFile,
} from './notes-file.ts';
import type { NotesSnapshot } from './ports.ts';

/**
 * Ce que ces tests figent : LE FICHIER D'IMPORT EST UNE ENTRÉE ÉTRANGÈRE.
 *
 * L'utilisateur choisit n'importe quel fichier, et l'import REMPLACE toutes
 * ses notes. `parseNotesFile` est donc la seule porte : ce qu'il laisse
 * passer est écrit tel quel, en local comme dans Supabase. Les deux
 * adaptateurs le partagent ; ce module n'était couvert qu'à 12 %, par
 * l'unique chemin heureux de l'e2e.
 *
 * Chaque refus doit arriver AVANT que quoi que ce soit ne soit effacé : un
 * `parseNotesFile` qui lève laisse les notes en place, c'est l'appelant qui
 * n'écrit qu'après lui.
 */

const note = (id: string, text: string) => ({
  id,
  text,
  createdAt: '2026-11-06T10:00:00.000Z',
});
const enveloppe = (data: unknown, v: number = notesStoreOptions.version) =>
  JSON.stringify({ v, data });

describe('parseNotesFile et stringifyNotesFile', () => {
  it('relit ce qu’ils ont écrit, à l’identique', () => {
    const instantane: NotesSnapshot = {
      notes: [
        note('a', 'Première'),
        note('b', 'Deuxième, avec « guillemets »'),
      ],
    };
    expect(parseNotesFile(stringifyNotesFile(instantane))).toEqual(instantane);
  });

  it('écrit l’enveloppe versionnée du magasin, `{ v, data }`', () => {
    const fichier = JSON.parse(stringifyNotesFile({ notes: [] }));
    expect(fichier).toEqual({
      v: notesStoreOptions.version,
      data: { notes: [] },
    });
  });

  it('ne garde rien d’un import à l’autre : chaque lecture part d’un magasin vide', () => {
    parseNotesFile(enveloppe({ notes: [note('a', 'Une')] }));
    expect(parseNotesFile(enveloppe({ notes: [] }))).toEqual({ notes: [] });
  });
});

describe('ce que parseNotesFile refuse', () => {
  it('un fichier qui n’est pas du JSON', () => {
    expect(() => parseNotesFile('pas du json {')).toThrow(/pas du JSON/);
  });

  it('un fichier vide (`null`)', () => {
    expect(() => parseNotesFile('null')).toThrow(/vide/);
  });

  it('un fichier exporté par une version plus récente, au lieu de le contourner', () => {
    expect(() =>
      parseNotesFile(enveloppe({ notes: [] }, notesStoreOptions.version + 1))
    ).toThrow(/plus récente/);
  });

  it('des notes sans enveloppe : version 0, et aucune migration ne part de 0', () => {
    // C'est la forme d'avant le magasin versionné. Le jour où une version
    // l'accepte, ce test tombe et c'est voulu : il faudra une `migrations[0]`.
    expect(() => parseNotesFile(JSON.stringify({ notes: [] }))).toThrow(
      /aucune chaîne de migrations depuis la version 0/
    );
  });

  it('le fichier d’une autre application, par son format', () => {
    expect(() =>
      parseNotesFile(enveloppe({ depenses: [{ montant: 12 }] }))
    ).toThrow(/ne correspond pas à cette application/);
  });

  it('une note vide, ou plus longue que ce que l’écran laisse saisir', () => {
    expect(() => parseNotesFile(enveloppe({ notes: [note('a', '')] }))).toThrow(
      /ne correspond pas/
    );
    expect(() =>
      parseNotesFile(enveloppe({ notes: [note('a', 'x'.repeat(2001))] }))
    ).toThrow(/ne correspond pas/);
  });

  it('une note sans identifiant', () => {
    expect(() =>
      parseNotesFile(enveloppe({ notes: [note('', 'Texte')] }))
    ).toThrow(/ne correspond pas/);
  });
});

describe('ce que parseNotesFile ne laisse pas passer en douce', () => {
  it('les champs inconnus d’une note : seuls ceux du schéma sont écrits', () => {
    const lu = parseNotesFile(
      enveloppe({
        notes: [
          { ...note('a', 'Texte'), html: '<img src=x onerror=alert(1)>' },
        ],
      })
    );
    expect(lu.notes[0]).toEqual(note('a', 'Texte'));
  });

  it('une clé `__proto__` ne pollue ni le résultat ni les objets', () => {
    const lu = parseNotesFile(
      '{"v":1,"data":{"notes":[],"__proto__":{"pollue":true}}}'
    );
    expect(Object.keys(lu)).toEqual(['notes']);
    expect(({} as Record<string, unknown>).pollue).toBeUndefined();
    expect((lu as Record<string, unknown>).pollue).toBeUndefined();
  });
});
