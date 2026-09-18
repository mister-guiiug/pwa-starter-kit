import {
  BrowserRouter,
  Link,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { Home, Info, Settings, UserRound } from 'lucide-react';
import { AppHeader } from '@mister-guiiug/dev-pwa-config/react/app-header';
import { PageContainer } from '@mister-guiiug/dev-pwa-config/react/page-container';
import { BottomNav } from '@mister-guiiug/dev-pwa-config/react/bottom-nav';
import { ThemeToggle } from '@mister-guiiug/dev-pwa-config/react/theme-toggle';
import { ObservabilityBoundary } from '@mister-guiiug/dev-pwa-config/react/error-boundary';
import { ConnectionBanner } from '@mister-guiiug/dev-pwa-config/react/connection-banner';
import { ConsentBanner } from '@mister-guiiug/dev-pwa-config/react/consent-banner';
import { usePageViews } from '@mister-guiiug/dev-pwa-config/react/use-page-views';
import { AppUpdates } from '@mister-guiiug/dev-pwa-config/react/app-updates';
import { registerSW } from 'virtual:pwa-register';
import { useI18n } from './i18n/index.ts';
import { HomeScreen } from './features/home/HomeScreen.tsx';
import { SettingsScreen } from './features/settings/SettingsScreen.tsx';
import { AboutScreen } from './features/about/AboutScreen.tsx';
import { AccountScreen } from './features/account/AccountScreen.tsx';

/**
 * LE CADRE : en-tête, contenu borné, barre basse.
 *
 * Les trois côtés viennent du socle. Neuf apps avaient écrit leur en-tête (de
 * 36 à 377 lignes) et la mise en page était la même partout — seul le CONTENU
 * différait. `AppHeader` ne décide rien de ce contenu : il pose le collant, la
 * zone sûre iOS, le titre en `h1` et la rangée d'actions.
 *
 * LE PIED DE PAGE N'EST PAS ICI, ET C'EST LA RÈGLE. Rendu dans la coquille,
 * hors des routes, `<AppFooter>` suivait chaque écran — trois liens sortants
 * sous une saisie. La règle famille du 06/09/2026 le veut sur deux écrans, et
 * deux seulement : l'accueil et À propos — c'est là qu'il est rendu, une ligne
 * dans chacun. `pwa-doctor` (`liens-famille`) refuse la coquille depuis.
 *
 * `linkComponent={Link}` avec `hrefProp="to"` : les composants de navigation
 * sont agnostiques de routeur, et c'est ainsi qu'on leur donne celui de l'app.
 * Un `<BottomNav />` sans `items` rend une barre VIDE — c'est le piège que la
 * campagne d'adoption a rencontré, et il ne produit aucune erreur de type.
 */
function Shell() {
  const { t } = useI18n();
  const { pathname } = useLocation();

  /*
   * UNE VUE DE PAGE PAR NAVIGATION — ni zéro, ni deux. PostHog en envoie une
   * au chargement ET à chaque changement d'historique quand on le laisse
   * faire ; les apps du parc étant en `HashRouter`, chaque navigation serait
   * comptée DEUX fois. `initAnalytics` pose donc `capture_pageview: false`
   * pour que toutes passent par ici, la première comprise. Sans ce hook, à
   * l'inverse, la navigation d'une PWA est invisible et la durée de session
   * fausse.
   *
   * Il ne fait rien tant que le consentement n'est pas accordé : il se monte
   * donc sans condition.
   */
  usePageViews(pathname);

  const nav = [
    {
      href: '/',
      label: t('nav.home'),
      icon: <Home aria-hidden="true" />,
      end: true,
    },
    {
      href: '/reglages',
      label: t('nav.settings'),
      icon: <Settings aria-hidden="true" />,
    },
    {
      href: '/compte',
      label: t('nav.account'),
      icon: <UserRound aria-hidden="true" />,
    },
    {
      href: '/a-propos',
      label: t('nav.about'),
      icon: <Info aria-hidden="true" />,
    },
  ];

  const titles: Record<string, string> = {
    '/': t('home.title'),
    '/reglages': t('settings.title'),
    '/compte': t('account.title'),
    '/a-propos': t('about.title'),
  };

  return (
    <>
      {/* Premier élément focalisable de la page : sans lui, atteindre le
          contenu au clavier demande de traverser toute la navigation. */}
      <a href="#contenu" className="sr-only focus:not-sr-only">
        Aller au contenu
      </a>

      <AppHeader
        title={titles[pathname] ?? t('app.name')}
        actions={<ThemeToggle />}
        backHref={pathname === '/' ? undefined : '/'}
        linkComponent={Link}
        hrefProp="to"
      />

      <ConnectionBanner />

      <PageContainer as="main" id="contenu" width="md" reserve="bottom-nav">
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/reglages" element={<SettingsScreen />} />
          <Route path="/compte" element={<AccountScreen />} />
          <Route path="/a-propos" element={<AboutScreen />} />
          {/* Le repli de route rend l'accueil ; le repli de SERVEUR est le
              `404.html` posé par `spaFallbackPlugin`. Les deux sont
              nécessaires : sans le second, GitHub Pages sert sa propre page
              d'erreur avant que ce routeur n'existe. */}
          <Route path="*" element={<HomeScreen />} />
        </Routes>
        {/*
          LE BANDEAU DE CONSENTEMENT, DANS LE FLUX DU CONTENU. Une `region`,
          pas une boîte modale : il ne recouvre rien, ne piège pas le focus, et
          l'application reste utilisable derrière. Obtenir un consentement en
          bloquant l'écran est la figure que le RGPD appelle un « dark
          pattern ».

          IL NE REND RIEN tant que `VITE_POSTHOG_KEY` n'est pas posée sur le
          dépôt : sans clé il n'y a rien à mesurer, donc rien à demander. Une app
          engendrée depuis ce squelette part donc muette, et poser la variable
          est le seul geste qui l'allume.

          LE `loader` N'EST PAS FACULTATIF EN PRATIQUE, et c'est le piège de
          cette prop. Sans lui, le socle retombe sur un spécificateur
          volontairement non analysable (`['posthog','js'].join('-')`) — utile
          pour qu'une app SANS `posthog-js` construise quand même, mais dans un
          bundle servi au navigateur cet import ne se résout pas. Le socle
          l'attrape et se tait : le bandeau s'affiche, l'accord est donné, et
          RIEN NE PART. C'est exactement le défaut « câblé mais muet » que ce
          parc a déjà payé. Le passer rend l'import analysable par Vite, qui
          émet le morceau et le charge à l'accord — pas avant.

          ET C'EST LA BUILD `slim`, PAS L'ENTRÉE PAR DÉFAUT. Mesuré le
          19/09/2026 : 50,1 kB gzip contre 97,6 pour `posthog-js` tout court.
          Ce qu'elle laisse dehors — enregistrement de session, autocapture,
          sondages, barre d'outils, capture d'exceptions — est exactement ce
          que l'ADR 0012 a DÉCIDÉ de couper, et que le socle éteint déjà par
          `OPTIONS_VIE_PRIVEE`. L'éteindre par une option et ne pas l'embarquer
          du tout ne se valent pas : une option se rallume, un code absent non.
          Le chemin passe par `dist/` faute de table `exports` dans le paquet ;
          s'il changeait, le build casserait — bruyamment, ce qui est le bon
          sens de l'échec ici.
        */}
        <ConsentBanner
          posthogKey={import.meta.env.VITE_POSTHOG_KEY}
          loader={() => import('posthog-js/dist/module.slim.js')}
        />
      </PageContainer>

      <BottomNav
        items={nav}
        linkComponent={Link}
        hrefProp="to"
        placement="fixed"
      />
    </>
  );
}

export function App() {
  return (
    <ObservabilityBoundary>
      {/* `registerType: 'prompt'` : une nouvelle version ne recharge JAMAIS la
          page toute seule. Trois apps du parc étaient en `autoUpdate` et
          pouvaient recharger au milieu d'une saisie. `checkEvery` fait
          découvrir une version à une PWA installée restée ouverte plusieurs
          jours, qui autrement ne verrait rien avant un démarrage à froid. */}
      <AppUpdates registerSW={registerSW} checkEvery="1h">
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <Shell />
        </BrowserRouter>
      </AppUpdates>
    </ObservabilityBoundary>
  );
}
