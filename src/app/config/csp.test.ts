import { describe, expect, it } from 'vitest';
import { supabaseOrigins } from './csp.ts';

/**
 * Ce que ces tests figent : LA CSP S'OUVRE AU PROJET SUPABASE QUAND, ET
 * SEULEMENT QUAND, L'APPLICATION LE CHOISIT.
 *
 * Relevé du 05/11/2026 sur miss-arcade, publiée en mode Supabase : six refus
 * CSP au premier chargement, `connect-src` ne nommant que `'self'` et
 * PostHog. Les données ne passaient pas, MÊME EN LIGNE, et l'application
 * tournait sur ses valeurs de démonstration sans le dire. Le modèle du
 * squelette avait le même défaut : il le transmettait à chaque naissance.
 */
const PROJET = {
  VITE_SUPABASE_URL: 'https://abcdefghijklmnop.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'cle-anon-de-test',
};

describe('les origines Supabase de la CSP', () => {
  it('ouvre le projet, en HTTPS et en websocket (Realtime)', () => {
    expect(supabaseOrigins(PROJET)).toEqual([
      'https://abcdefghijklmnop.supabase.co',
      'wss://abcdefghijklmnop.supabase.co',
    ]);
  });

  it('n’ouvre RIEN sans configuration : le mode local ne parle à personne', () => {
    expect(supabaseOrigins({})).toEqual([]);
    // Une seule des deux variables : le sélecteur retombe en local, la CSP
    // aussi — même règle, même module du socle.
    expect(
      supabaseOrigins({ VITE_SUPABASE_URL: PROJET.VITE_SUPABASE_URL })
    ).toEqual([]);
  });

  it('suit le choix explicite : `VITE_BACKEND=local` garde la porte fermée', () => {
    expect(supabaseOrigins({ ...PROJET, VITE_BACKEND: 'local' })).toEqual([]);
  });

  it('suit la pile locale de la CLI, en clair : http et ws', () => {
    // `supabase start` sert l'API sur 127.0.0.1:54321. Un joker
    // `*.supabase.co` la laissait bloquée en développement.
    expect(
      supabaseOrigins({
        VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
        VITE_SUPABASE_ANON_KEY: 'cle',
      })
    ).toEqual(['http://127.0.0.1:54321', 'ws://127.0.0.1:54321']);
  });

  it('ignore une adresse illisible plutôt que de casser le build', () => {
    expect(
      supabaseOrigins({ ...PROJET, VITE_SUPABASE_URL: 'pas une adresse' })
    ).toEqual([]);
  });
});
