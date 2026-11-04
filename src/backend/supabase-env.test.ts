import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * La fabrique Supabase de l'application lit-elle l'environnement Vite ?
 *
 * Jusqu'au socle 6.28.4, la fabrique lisait `{}` quand on ne lui passait pas
 * `env` : l'écran Compte s'affichait, puis « Recevoir un lien » échouait sur
 * « configuration manquante », alors que l'adresse du projet était dans le
 * bundle (mister-settle, miss-holi-voyage, miss-arcade). Le socle lit
 * désormais l'environnement Vite seul (dev-pwa-config#482), mais pas sous
 * Vitest, qui l'exécute sans Vite. Ce test importe donc le VRAI module, avec
 * des variables posées par `vi.stubEnv`, et exige qu'il les ait lues.
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
