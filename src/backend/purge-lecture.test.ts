import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Ce que ces tests figent : LA COPIE DE LECTURE NE SURVIT PAS AU COMPTE.
 *
 * L'audit du 05/11/2026 relève deux applications du parc dont le cache —
 * celui du service worker pour l'une, IndexedDB pour l'autre — survit à la
 * déconnexion : sur un appareil partagé, le compte suivant relit hors ligne
 * les données du précédent. Le squelette ajoute une copie (ADR 0013) ; il
 * doit donc la purger, et le prouver.
 *
 * Le backend est construit POUR DE VRAI en mode distant — variables posées,
 * module réimporté —, comme dans `supabase-env.test.ts` : c'est le
 * branchement qu'on vérifie, pas une maquette de lui.
 */
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.resetModules();
});

async function enModeDistant() {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://exemple.supabase.co');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'cle-anon-de-test');
  vi.resetModules();
  const backend = await import('./index.ts');
  expect(backend.coverage.kind).toBe('supabase');
  expect(backend.notesCache).not.toBeNull();
  return { backend, purge: vi.spyOn(backend.notesCache!, 'purge') };
}

describe('la purge de la copie de lecture', () => {
  it('suit l’événement SIGNED_OUT de la session, et lui seul', async () => {
    const { purge } = await enModeDistant();
    const { onAuthEvent } = await import('../auth/index.ts');

    onAuthEvent('TOKEN_REFRESHED');
    onAuthEvent('SIGNED_IN');
    expect(purge).not.toHaveBeenCalled();

    onAuthEvent('SIGNED_OUT');
    expect(purge).toHaveBeenCalledTimes(1);
  });

  it('suit l’effacement du compte, même quand la session locale résiste', async () => {
    const { purge } = await enModeDistant();
    const { supabase } = await import('./supabase.ts');
    const { deleteMyAccount } =
      await import('../features/account/delete-account.ts');
    vi.spyOn(supabase, 'getClient').mockResolvedValue({
      rpc: async () => ({ error: null }),
      // La session qui résiste : aucun `SIGNED_OUT` ne viendra.
      auth: { signOut: async () => ({ error: { message: 'verrou' } }) },
    } as never);

    await deleteMyAccount();
    expect(purge).toHaveBeenCalledTimes(1);
  });

  it('ne fait rien en mode local : il n’y a pas de copie', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
    vi.resetModules();
    const backend = await import('./index.ts');
    expect(backend.notesCache).toBeNull();
    await expect(backend.purgeReadCache()).resolves.toBeUndefined();
  });
});
