import { describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseClientFactory } from '@mister-guiiug/dev-pwa-config/supabase-client';

/**
 * LA CASE DE SESSION, CONTRE LE VRAI SDK.
 *
 * La fabrique du socle annonce la case avant de charger le SDK
 * (`storageKey()`) et la passe au client qu'elle crée. Le socle n'a pas le
 * SDK : c'est ici, où il est installé, qu'on vérifie deux choses.
 *
 *  1. Le client créé range bien sa session sous la case annoncée.
 *  2. Cette case est le DÉFAUT du SDK installé : c'est là que les sessions
 *     d'avant la 6.31.0 ont été rangées. Une montée du SDK qui changerait sa
 *     formule se verrait ici, avant de déconnecter qui que ce soit.
 */
const URL_PROJET = 'https://abcdefghijklmnop.supabase.co';
const ENV = {
  VITE_SUPABASE_URL: URL_PROJET,
  VITE_SUPABASE_ANON_KEY: 'cle-anon-de-test',
};
const caseDuClient = (client: unknown) =>
  (client as { auth: { storageKey: string } }).auth.storageKey;

describe('la case de session de la fabrique', () => {
  it('est celle sous laquelle le client créé range sa session', async () => {
    const fabrique = createSupabaseClientFactory({
      env: ENV,
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const client = await fabrique.getClient();
    expect(caseDuClient(client)).toBe(fabrique.storageKey());
  });

  it('est le défaut du SDK installé', () => {
    const parDefaut = createClient(URL_PROJET, 'cle-anon-de-test', {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const fabrique = createSupabaseClientFactory({ env: ENV });
    expect(fabrique.storageKey()).toBe(caseDuClient(parDefaut));
  });
});
