import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * La fabrique Supabase de l'application lit-elle l'environnement Vite ?
 *
 * Le socle lit `{}` quand on ne lui passe pas `env`. L'oubli ne se voit qu'en
 * production : l'écran Compte s'affiche, puis « Recevoir un lien » échoue sur
 * « configuration manquante », alors que l'adresse du projet est dans le
 * bundle. Ce test importe le VRAI module, avec des variables posées, et exige
 * qu'il les ait lues.
 */
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('la fabrique Supabase de l’application', () => {
  it('lit VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://exemple.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'cle-anon-de-test');
    vi.resetModules();
    const { supabase } = await import('./supabase.ts');
    expect(supabase.missing()).toEqual([]);
    expect(supabase.isConfigured()).toBe(true);
  });

  it('dit ce qui manque quand les variables sont absentes', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
    vi.resetModules();
    const { supabase } = await import('./supabase.ts');
    expect(supabase.isConfigured()).toBe(false);
    expect(supabase.missing()).toEqual([
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY',
    ]);
  });
});
