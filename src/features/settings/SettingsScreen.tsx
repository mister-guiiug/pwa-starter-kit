import { useState } from 'react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { Card, CardHeader } from '@mister-guiiug/dev-pwa-config/react/card';
import { ConfirmDialog } from '@mister-guiiug/dev-pwa-config/react/confirm-dialog';
import { SegmentedControl } from '@mister-guiiug/dev-pwa-config/react/segmented-control';
import { ThemeToggle } from '@mister-guiiug/dev-pwa-config/react/theme-toggle';
import { dateSlug, downloadText } from '@mister-guiiug/dev-pwa-config/download';
import { useI18n } from '../../i18n/index.ts';
import { backend, coverage } from '../../backend/index.ts';
import { useNotes } from '../home/store.ts';
import { configReport } from '../../app/config/env.ts';

/**
 * L'écran de réglages : le seul écran que TOUTES les apps de la famille ont, et
 * dont la COMPOSITION reste métier — c'est pourquoi le socle livre les briques
 * (`ThemeToggle`, `AppVersion`, `FamilyApps`, `ConfirmDialog`, `downloadText`)
 * et non l'écran. Onze apps en ont un, de 142 à 728 lignes.
 *
 * Ce qu'il montre ici et qui manque partout ailleurs : **le diagnostic de
 * configuration**. Une app déjà en ligne doit pouvoir dire ce qui lui manque et
 * sur quoi elle est retombée, au lieu de laisser croire qu'un compte distant
 * fonctionne alors que tout est resté sur l'appareil.
 */
export function SettingsScreen() {
  const { t, locale, setLocale, locales } = useI18n();
  const clear = useNotes(state => state.clear);
  const [confirming, setConfirming] = useState(false);

  const exportNotes = async () => {
    const json = await backend.notes.export();
    if (json)
      downloadText(json, `notes-${dateSlug()}.json`, 'application/json');
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader title={t('settings.appearance')} />
        <ThemeToggle />
      </Card>

      <Card>
        <CardHeader title={t('settings.language')} />
        <SegmentedControl
          value={locale}
          onChange={value => setLocale(value as typeof locale)}
          ariaLabel={t('settings.language')}
          options={locales.map(code => ({
            value: code,
            label: code.toUpperCase(),
          }))}
        />
      </Card>

      <Card>
        <CardHeader
          title={t('settings.backend')}
          subtitle={coverage.kind ?? t('settings.backendLocal')}
        />
        <ul className="m-0 list-none p-0 text-sm">
          {configReport().map(entry => (
            <li key={entry.name} className="flex justify-between gap-3 py-1">
              <code>{entry.name}</code>
              <span style={{ color: 'var(--dwc-text-soft)' }}>
                {entry.present ? '✓' : entry.fallback}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardHeader title={t('settings.data')} />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void exportNotes()}>
            {t('settings.export')}
          </Button>
          <Button variant="danger" onClick={() => setConfirming(true)}>
            {t('settings.reset')}
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={confirming}
        destructive
        title={t('settings.resetConfirm')}
        message={t('settings.resetBody')}
        onConfirm={() => {
          void clear();
          setConfirming(false);
        }}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
