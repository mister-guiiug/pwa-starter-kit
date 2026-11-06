import { describe, expect, it } from 'vitest';
import {
  CONTENT_PAGES_DIR,
  SERVED_HOME_FILE,
  contentPageFiles,
} from '@mister-guiiug/dev-pwa-config/vite-pwa-base';

/**
 * CE QUI NE PARLE QUE DU SQUELETTE NE NAÎT DANS AUCUNE APPLICATION.
 *
 * Le générateur recopie l'arbre entier et n'y change que les noms. Les guides
 * de `content/pages/` et le texte d'accueil sont donc nés tels quels dans
 * miss-arcade et miss-holi-voyage (31/10/2026) : l'accueil de l'une disait
 * « C'est le squelette des applications de la famille », et trois guides
 * existaient mot pour mot sur trois sites. Un moteur n'en garde qu'un, et une
 * IA répète ce qu'ils affirment.
 *
 * `squelette.propres` de `package.json` liste ce que le générateur ne recopie
 * pas. Ce test tient la liste à jour : chaque page publiée et le texte
 * d'accueil servi y sont, et chaque entrée existe encore — une entrée périmée
 * laisserait passer, sans rien dire, le fichier qu'on a renommé.
 *
 * Il se liste lui-même : dans une application, il n'aurait rien à vérifier.
 */

const CE_FICHIER = 'src/squelette.test.ts';

const paquet = Object.values(
  import.meta.glob<{ squelette?: Record<string, unknown> }>('/package.json', {
    eager: true,
    import: 'default',
  })
)[0];
const { propres, refusALaNaissance } = paquet?.squelette ?? {};

/**
 * L'arbre du dépôt tel que Vite le voit : des chemins, aucun fichier n'est lu.
 * Un `import.meta.glob` plutôt que `node:fs`, que les types de l'application
 * ne connaissent pas. Vite retire du résultat le fichier qui appelle : il est
 * rajouté, puisqu'il s'exécute.
 */
const arbre = [
  CE_FICHIER,
  ...Object.keys(
    import.meta.glob([
      '/**/*',
      '!/node_modules/**',
      '!/dist/**',
      '!/coverage/**',
    ])
  ).map(chemin => chemin.slice(1)),
];

const liste = Array.isArray(propres) ? propres : [];

/** Un chemin que la liste couvre : nommé, ou sous un dossier nommé (`…/`). */
const couvert = (chemin: string) =>
  liste.some(p =>
    typeof p === 'string' && p.endsWith('/')
      ? chemin.startsWith(p)
      : chemin === p
  );

describe('les fichiers propres au squelette', () => {
  it('sont une liste de chemins relatifs au dépôt', () => {
    expect(Array.isArray(propres)).toBe(true);
    for (const p of liste) {
      expect(typeof p).toBe('string');
      expect(p).not.toMatch(/^\/|\\|(^|\/)\.\.(\/|$)/);
    }
  });

  it('existent tous : une entrée périmée laisserait passer le fichier renommé', () => {
    for (const p of liste as string[]) {
      const present = p.endsWith('/')
        ? arbre.some(f => f.startsWith(p))
        : arbre.includes(p);
      expect(present, `${p} n'existe plus`).toBe(true);
    }
  });

  it('couvrent chaque page de contenu que le build publie', () => {
    const pages = contentPageFiles(CONTENT_PAGES_DIR).map(
      f => `${CONTENT_PAGES_DIR}/${f}`
    );
    expect(pages.filter(p => !couvert(p))).toEqual([]);
  });

  it('couvrent le texte d’accueil que le socle sert aux robots', () => {
    if (arbre.includes(SERVED_HOME_FILE)) {
      expect(couvert(SERVED_HOME_FILE)).toBe(true);
    }
  });

  it('se couvrent eux-mêmes : ce test n’a rien à vérifier dans une application', () => {
    expect(couvert(CE_FICHIER)).toBe(true);
  });

  it('laissent l’application naître sans dette : le refus de la page manquante est posé', () => {
    // Toutes les pages partent (test précédent) : l'application naît sans
    // page de contenu, et `pwa-doctor --strict` ferait échouer son premier
    // build. Le refus motivé l'en dispense jusqu'à sa première page.
    if (contentPageFiles(CONTENT_PAGES_DIR).length) {
      expect(refusALaNaissance).toMatchObject({
        'seo-content-pages': expect.stringMatching(/\S/),
      });
    }
    // Une raison vide n'est pas un refus : le docteur l'ignorerait.
    for (const raison of Object.values(
      (refusALaNaissance ?? {}) as Record<string, unknown>
    )) {
      expect(raison).toEqual(expect.stringMatching(/\S/));
    }
  });
});
