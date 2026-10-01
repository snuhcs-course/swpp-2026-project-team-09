import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// A page as its site served it, saved once in test/pages/. The tests never call the sites.
export function savedPage(name: string): string {
  return readFileSync(fileURLToPath(new URL(`pages/${name}.html`, import.meta.url)), 'utf8');
}
