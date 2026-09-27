import { Card, CardHeader } from '@mister-guiiug/dev-pwa-config/react/card';
import { FamilyAbout } from '@mister-guiiug/dev-pwa-config/react/family-about';
import { useI18n } from '../../i18n/index.ts';
import { APP_ID, REPO_URL } from '../../app/links.ts';

/**
 * L'écran « à propos » : installation, grille famille, pied de page.
 *
 * PROMU, PAS INVENTÉ. Cet écran assemblait déjà `PwaInstallPrompt` +
 * `FamilyApps` (`showSource={false}`) + `AppFooter` — `FamilyAbout` du socle
 * est exactement cette composition. L'intro métier reste en `children`.
 *
 * LE PIED DE PAGE EST ICI ET SUR L'ACCUEIL, nulle part ailleurs — la règle
 * famille du 06/09/2026, que `pwa-doctor` vérifie.
 */
export function AboutScreen() {
  const { t } = useI18n();

  return (
    <FamilyAbout currentAppId={APP_ID} repoUrl={REPO_URL} issues>
      <Card>
        <CardHeader title={t('about.title')} subtitle={t('app.tagline')} />
        <p className="m-0">{t('about.what')}</p>
      </Card>
    </FamilyAbout>
  );
}
