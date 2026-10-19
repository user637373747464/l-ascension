/**
 * Address of a file of the `public/` folder. On GitHub Pages the app lives in a sub-folder (…github.io/ascension/),
 * so a path starting with "/" must be prefixed by the site's base address.
 */
export function asset(path: string): string {
  return path.startsWith('/') ? `${import.meta.env?.BASE_URL ?? '/'}${path.slice(1)}` : path
}
