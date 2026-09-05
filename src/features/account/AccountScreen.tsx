import { useState } from 'react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { Card, CardHeader } from '@mister-guiiug/dev-pwa-config/react/card';
import { Badge } from '@mister-guiiug/dev-pwa-config/react/badge';
import { LoginForm } from '@mister-guiiug/dev-pwa-config/react/login-form';
import { useAuthContext } from '@mister-guiiug/dev-pwa-config/react/auth-provider';
import { useI18n } from '../../i18n/index.ts';
import { useRole } from '../../auth/index.ts';
import { coverage } from '../../backend/index.ts';

/**
 * L'écran de compte — le formulaire que quatre applications avaient écrit
 * chacune (64, 58, 218 et 170 lignes), pour le même écran : deux champs, un
 * bouton, une erreur traduite.
 *
 * `LoginForm` du socle est NON CONTRÔLÉ et lu par `FormData` : c'est ce qui le
 * rend testable sans simuler la frappe, et c'est une décision du socle, pas un
 * oubli.
 *
 * SANS BACKEND, L'ÉCRAN RESTE. Il dit que le mode est local au lieu de
 * disparaître : un écran masqué par une condition finit par diverger de
 * celui qui s'affiche, et personne ne le voit avant la mise en service.
 */
export function AccountScreen() {
  const { t } = useI18n();
  const { signedIn, user, signIn, signOut, ready } = useAuthContext<
    unknown,
    { email?: string }
  >();
  const { admin } = useRole();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (coverage.kind !== 'supabase') {
    return (
      <Card>
        <CardHeader
          title={t('account.title')}
          subtitle={t('account.localMode')}
        />
        <p className="m-0">{t('account.localModeBody')}</p>
      </Card>
    );
  }

  if (!ready) return null;

  if (signedIn) {
    return (
      <Card>
        <CardHeader
          title={t('account.title')}
          subtitle={user?.email ?? ''}
          action={
            admin ? <Badge tone="info">{t('account.admin')}</Badge> : null
          }
        />
        <Button variant="outline" onClick={() => void signOut()}>
          {t('account.signOut')}
        </Button>
      </Card>
    );
  }

  return (
    <Card>
      <LoginForm
        title={t('account.title')}
        busy={busy}
        error={error}
        onSubmit={values => {
          setBusy(true);
          setError(null);
          void signIn(values.email, values.password)
            .then(result => {
              // Le message est DÉJÀ traduit par `auth/errors-fr` du socle :
              // afficher le message brut de Supabase donnerait de l'anglais
              // technique à quelqu'un qui a juste mal tapé son mot de passe.
              if (!result.ok) setError(result.error?.message ?? null);
            })
            .finally(() => setBusy(false));
        }}
      />
    </Card>
  );
}
