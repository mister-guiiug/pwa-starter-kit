import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '../../i18n/index.ts';
import type { CachedNotes, ReadSnapshot } from '../../backend/cached-notes.ts';
import { StaleCopy } from './StaleCopy.tsx';

/**
 * Ce que ces tests figent : QUAND L'ÉCRAN MONTRE UNE COPIE, IL LE DIT — et de
 * quand elle date. Une copie présentée comme l'état du moment est un mensonge
 * poli ; c'est celui que l'audit du 05/11/2026 relève dans plusieurs apps,
 * dont le bandeau promet ce que l'application ne fait pas.
 */

/** Une copie de lecture de comptoir : un instantané qu'on pilote à la main. */
function copieFactice(staleAt: string | null) {
  let snapshot: ReadSnapshot = { staleAt };
  const listeners = new Set<() => void>();
  const cache = {
    notes: {} as CachedNotes['notes'],
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,
    purge: async () => {},
  } satisfies CachedNotes;
  return {
    cache,
    poser(at: string | null) {
      snapshot = { staleAt: at };
      for (const listener of listeners) listener();
    },
  };
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('dwc_locale', 'fr');
});

describe('StaleCopy', () => {
  it('ne dit rien tant que la lecture vient du serveur', () => {
    const { cache } = copieFactice(null);
    const { container } = render(
      <I18nProvider>
        <StaleCopy cache={cache} onRetry={() => {}} />
      </I18nProvider>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('annonce la copie, datée, et propose de relire', async () => {
    const ilYADeuxHeures = new Date(Date.now() - 2 * 3600_000);
    const { cache, poser } = copieFactice(null);
    const relire = vi.fn();
    render(
      <I18nProvider>
        <StaleCopy cache={cache} onRetry={relire} />
      </I18nProvider>
    );

    act(() => poser(ilYADeuxHeures.toISOString()));
    expect(
      screen.getByText(/copie enregistrée il y a\s2\sheures/)
    ).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(relire).toHaveBeenCalledTimes(1);

    // Lecture fraîche : l'avertissement part de lui-même.
    act(() => poser(null));
    expect(screen.queryByText(/copie enregistrée/)).toBeNull();
  });

  it('relit d’elle-même au retour du réseau', () => {
    const { cache } = copieFactice(new Date().toISOString());
    const relire = vi.fn();
    render(
      <I18nProvider>
        <StaleCopy cache={cache} onRetry={relire} />
      </I18nProvider>
    );

    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(relire).toHaveBeenCalledTimes(1);
  });
});
