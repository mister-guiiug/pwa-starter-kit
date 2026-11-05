import { useEffect, useSyncExternalStore } from 'react';
import { ErrorBanner } from '@mister-guiiug/dev-pwa-config/react/error-banner';
import { useI18n } from '../../i18n/index.ts';
import type { CachedNotes } from '../../backend/cached-notes.ts';

interface StaleCopyProps {
  cache: CachedNotes;
  /** Relire le serveur. */
  onRetry: () => unknown;
  className?: string;
}

/**
 * CE QUE L'ÉCRAN MONTRE EST UNE COPIE — et il le dit, avec sa date.
 *
 * Hors ligne, la liste vient de la copie de lecture (ADR 0013) : le dernier
 * état que le serveur a confirmé. Elle est vraie à sa date, pas forcément
 * maintenant — un autre appareil a pu écrire depuis. Sans ce bandeau, la copie
 * se ferait passer pour l'état du moment.
 *
 * Ton `info`, pas `danger` : rien n'est cassé, l'application fait ce qu'elle
 * promet. Le libellé de « Réessayer » est celui du bandeau de la file.
 *
 * LE RETOUR DU RÉSEAU RELIT TOUT SEUL. Un bandeau qui resterait affiché une
 * fois la connexion revenue dirait encore vrai — c'est bien une copie —, mais
 * demanderait un geste que l'application peut faire elle-même.
 */
export function StaleCopy({ cache, onRetry, className }: StaleCopyProps) {
  const { t, fmt } = useI18n();
  const { staleAt } = useSyncExternalStore(cache.subscribe, cache.getSnapshot);

  useEffect(() => {
    if (!staleAt) return undefined;
    const relire = () => void onRetry();
    window.addEventListener('online', relire);
    return () => window.removeEventListener('online', relire);
  }, [staleAt, onRetry]);

  if (!staleAt) return null;

  return (
    <ErrorBanner
      tone="info"
      className={className}
      message={t('home.stale', { when: fmt.relative(staleAt) })}
      retryLabel={t('home.sync.retry')}
      onRetry={() => void onRetry()}
    />
  );
}
