import { createI18n } from '@mister-guiiug/dev-pwa-config/react/i18n-lite';
import en from '@mister-guiiug/dev-pwa-config/react/labels-en';
import { messages } from './messages.ts';

/**
 * L'i18n de l'application, déclaré UNE FOIS au niveau module.
 *
 * `storageKey` n'est pas passé : le défaut `dwc_locale` est partagé par toutes
 * les apps de la famille, qui vivent sur la même origine GitHub Pages. La
 * langue choisie suit donc l'utilisateur de l'une à l'autre, et une valeur
 * inconnue de `locales` est simplement ignorée. Une app qui veut s'isoler
 * passe la sienne (motif famille : `'<app>_locale'`).
 *
 * `fmt` VIENT AVEC, et c'est le point. Le contexte rend des formateurs déjà
 * liés à la locale : `fmt.date(d)`, `fmt.number(v)`, `fmt.relative(d)`. Sans
 * eux, chaque écran refait le pont entre « la langue choisie » et « comment on
 * écrit les nombres » — ou l'oublie, ce que le parc a mesuré quatre-vingt-huit
 * fois sous la forme d'un `'fr-FR'` codé en dur.
 *
 * `react/i18n-lite`, ET NON `react/i18n`, POUR NE PAYER QUE NOS DEUX LANGUES.
 * Les deux posent `LabelsProvider`, qui traduit les libellés des composants du
 * socle (« Fermer », « Réessayer »…). Mais `react/i18n` embarque ces libellés
 * dans les sept langues du paquet, quelles que soient les `locales` — 9,5 kB
 * gzip préchargés pour cinq langues que l'app ne parle pas (mesure sur
 * mister-uwh-tactic, socle 6.37.0). Ici, le français est fourni d'office et
 * l'anglais par `labels: { en }`. Une locale ajoutée sans son dictionnaire
 * garderait des boutons en français, et la console le dit en développement :
 * ajouter alors `import es from '…/react/labels-es'` et `labels: { en, es }`.
 */
export const { I18nProvider, useI18n } = createI18n({
  messages,
  locales: ['fr', 'en'] as const,
  fallbackLocale: 'fr',
  labels: { en },
});
