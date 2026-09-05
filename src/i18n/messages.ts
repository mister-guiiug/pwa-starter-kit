/**
 * Les dictionnaires de l'application, une entrée par locale et TOUTES DE MÊME
 * FORME : `createI18n` dérive le type des clés du dictionnaire de repli, et le
 * compilateur refuse ensuite `t('cle.qui.nexiste.pas')`.
 *
 * Deux locales seulement ici. En ajouter une se fait en copiant `fr` et en
 * traduisant : la forme, elle, est vérifiée à la compilation.
 *
 * CE FICHIER NE CONTIENT PAS LES LIBELLÉS DES COMPOSANTS DU SOCLE (« Fermer »,
 * « Réessayer », « Retour »…). Ils vivent dans `react/labels`, en sept langues,
 * et `I18nProvider` pose `LabelsProvider` avec la locale courante tout seul.
 * Les redéclarer ici, c'est le travail que sept apps ont fait dans huit
 * fichiers-pont d'environ quatre cents lignes, avant que le socle ne porte les
 * traductions.
 */
/**
 * PAS DE `as const` ICI, et c'est délibéré. Il figerait chaque chaîne
 * française comme son PROPRE type littéral, et le dictionnaire anglais devrait
 * alors contenir… les mêmes mots français. La forme est ce qui doit
 * correspondre, pas le contenu.
 */
const fr = {
  app: {
    name: 'PWA Starter Kit',
    tagline: 'Le squelette de la famille, prêt à cloner.',
  },
  nav: {
    home: 'Accueil',
    settings: 'Réglages',
    about: 'À propos',
  },
  home: {
    title: 'Notes',
    empty: 'Aucune note pour le moment.',
    emptyHint: 'La première note montrera la persistance versionnée.',
    add: 'Ajouter',
    field: 'Nouvelle note',
    placeholder: 'Ce que je ne veux pas oublier',
    remove: 'Supprimer',
    removeConfirm: 'Supprimer cette note ?',
    removeBody: 'Elle ne sera pas récupérable.',
    count: {
      one: '{count} note',
      other: '{count} notes',
    },
  },
  settings: {
    title: 'Réglages',
    appearance: 'Apparence',
    language: 'Langue',
    data: 'Données',
    export: 'Exporter mes notes',
    reset: 'Tout effacer',
    resetConfirm: 'Effacer toutes les notes ?',
    resetBody: 'Cette action est définitive.',
    backend: 'Source de données',
    backendLocal: 'Cet appareil seulement',
  },
  about: {
    title: 'À propos',
    what: "Ce dépôt est le point de départ des applications de la famille. Il n'a pas de métier : il a le cadre.",
    version: 'Version',
  },
};

const en: typeof fr = {
  app: {
    name: 'PWA Starter Kit',
    tagline: 'The family skeleton, ready to clone.',
  },
  nav: {
    home: 'Home',
    settings: 'Settings',
    about: 'About',
  },
  home: {
    title: 'Notes',
    empty: 'No notes yet.',
    emptyHint: 'The first note will show versioned persistence at work.',
    add: 'Add',
    field: 'New note',
    placeholder: "What I don't want to forget",
    remove: 'Delete',
    removeConfirm: 'Delete this note?',
    removeBody: 'It cannot be recovered.',
    count: {
      one: '{count} note',
      other: '{count} notes',
    },
  },
  settings: {
    title: 'Settings',
    appearance: 'Appearance',
    language: 'Language',
    data: 'Data',
    export: 'Export my notes',
    reset: 'Erase everything',
    resetConfirm: 'Erase all notes?',
    resetBody: 'This cannot be undone.',
    backend: 'Data source',
    backendLocal: 'This device only',
  },
  about: {
    title: 'About',
    what: 'This repository is the starting point for the family applications. It has no domain: it has the frame.',
    version: 'Version',
  },
};

export const messages = { fr, en };
export type Messages = typeof fr;
