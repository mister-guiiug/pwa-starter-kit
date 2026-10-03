import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '@mister-guiiug/dev-pwa-config/react/auth-provider';
import { ToastProvider } from '@mister-guiiug/dev-pwa-config/react/toast';
import { I18nProvider } from './i18n/index.ts';
import { authAdapter } from './auth/index.ts';
import { Shell } from './App.tsx';

/*
 * L'ONGLET COURANT, SOUS LE CHEMIN DE GITHUB PAGES.
 *
 * La barre basse compare les `href` de ses entrées, relatifs au routeur, au
 * chemin courant. Sans `navCurrentPath`, elle lit `window.location.pathname`,
 * qui vaut `/pwa-starter-kit/` une fois déployé là où l'entrée vaut `/` : aucun
 * onglet n'était actif en ligne, jamais en développement ni en e2e, servis sous
 * `/`. Relevé le 03/10/2026 sur miss-devises, née de ce squelette.
 *
 * Le test place donc jsdom SOUS LA BASE, comme le navigateur déployé. Sans ce
 * geste, `location.pathname` vaut `/` et l'accueil serait trouvé par hasard.
 */
const BASE = '/pwa-starter-kit';

function monterSous(chemin: string) {
  window.history.replaceState(null, '', `${BASE}${chemin}`);
  render(
    <I18nProvider>
      {/* Les fournisseurs de `main.tsx` que les écrans lisent : la session et
          les notifications. `authAdapter()` rend `null` sans backend distant,
          le fournisseur reste alors en mode local. */}
      <AuthProvider adapter={authAdapter()}>
        <ToastProvider>
          <MemoryRouter basename={BASE} initialEntries={[`${BASE}${chemin}`]}>
            <Shell />
          </MemoryRouter>
        </ToastProvider>
      </AuthProvider>
    </I18nProvider>
  );
  const barre = within(
    screen.getByRole('navigation', { name: 'Navigation principale' })
  );
  // Une expression régulière, pas une chaîne : le socle ajoute « Page
  // actuelle » au nom accessible de l'entrée courante.
  return (nom: RegExp) => barre.getByRole('link', { name: nom });
}

beforeEach(() => {
  localStorage.clear();
  // Sans locale stockée, jsdom rapporte `en-US` et la barre parle anglais.
  localStorage.setItem('dwc_locale', 'fr');
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  window.history.replaceState(null, '', '/');
});

describe('sous un basename, la barre dit où l’on est', () => {
  it('marque « Accueil » comme page actuelle sur l’accueil', () => {
    const entree = monterSous('/');

    expect(entree(/^Accueil/)).toHaveAttribute('aria-current', 'page');
  });

  it('marque « Réglages », et plus l’accueil, sur les réglages', () => {
    const entree = monterSous('/reglages');

    expect(entree(/^Réglages/)).toHaveAttribute('aria-current', 'page');
    // L'accueil est `end: true` : il ne doit pas rester allumé sous un
    // chemin qui commence par `/`.
    expect(entree(/^Accueil/)).not.toHaveAttribute('aria-current');
  });
});
