import {
  missingConfig,
  resolveBackendKind,
} from '@mister-guiiug/dev-pwa-config/backend';
import { SUPABASE_ENV_KEYS } from '@mister-guiiug/dev-pwa-config/supabase-client';

/**
 * LES ORIGINES SUPABASE QUE LA CSP DOIT OUVRIR — lues dans l'environnement du
 * build, par `vite.config.ts`. Vide en mode local.
 *
 * LE DÉFAUT QUE ÇA CORRIGE, mesuré le 05/11/2026. `cspPlugin` du socle n'ouvre
 * `connect-src` qu'à `'self'`, PostHog et Sentry. Une application qui passe en
 * mode Supabase sans y toucher voit chaque requête refusée par sa propre
 * politique — miss-arcade, en production : six refus au premier chargement,
 * et des valeurs de démonstration à l'écran, MÊME EN LIGNE. Le modèle du
 * squelette avait le même trou, et le léguait à chaque naissance.
 *
 * LA MÊME RÈGLE QUE LE SÉLECTEUR DE BACKEND, PAR LE MÊME MODULE. Un choix
 * explicite (`VITE_BACKEND`) gagne, sinon les deux variables décident :
 * `resolveBackendKind` et `missingConfig` sont ceux que `createBackendSelector`
 * applique au démarrage. La politique s'ouvre donc exactement quand
 * l'application parle à Supabase — ni un build local plus permissif qu'il ne
 * faut, ni un build distant fermé.
 *
 * L'ORIGINE DU PROJET, PAS UN JOKER `*.supabase.co`. C'est la règle que le
 * socle applique déjà au DSN Sentry : ouvrir tout `*.supabase.co`, c'est
 * ouvrir la politique à tous les projets de tous les comptes. Et l'origine
 * lue dans l'adresse suit aussi la pile locale de la CLI (`supabase start`,
 * `http://127.0.0.1:54321`), que le joker laissait bloquée en développement.
 * Le websocket de Realtime part du même hôte, en `wss:` (ou `ws:` en clair).
 *
 * PAS D'`img-src` : le modèle ne sert aucune image du Storage. Une
 * application qui affiche des URL signées ajoute l'origine à `imgSrc` du
 * greffon — c'est ce que fait mister-settle pour ses justificatifs.
 */
export function supabaseOrigins(
  env: Readonly<Record<string, string | undefined>>
): string[] {
  const requises = [...SUPABASE_ENV_KEYS];
  const kind = resolveBackendKind(env, { kinds: { supabase: requises } });
  if (kind !== 'supabase' || missingConfig(env, requises).length > 0) {
    return [];
  }
  try {
    const projet = new URL(env.VITE_SUPABASE_URL ?? '');
    if (projet.protocol !== 'https:' && projet.protocol !== 'http:') return [];
    const socket = projet.protocol === 'https:' ? 'wss:' : 'ws:';
    return [projet.origin, `${socket}//${projet.host}`];
  } catch {
    // Une adresse illisible ne casse pas le build : le client Supabase ne
    // s'initialisera pas non plus, et la politique reste fermée.
    return [];
  }
}
