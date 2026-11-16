/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// The Assistant reads a Friend's position only through the Friend view, so none of its sources imports what the view
// reads.

const ASSISTANT = join(import.meta.dirname, '../src/assistant');

const FORBIDDEN = ['position-store', 'visibility.service', 'location-sharing.service'];

const sources = readdirSync(ASSISTANT, { recursive: true, encoding: 'utf8' }).filter((path) => path.endsWith('.ts'));

const importedPaths = (text: string): string[] =>
  [...text.matchAll(/\bfrom\s+['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/gu)].map(
    ([, from, dynamic]) => from ?? dynamic ?? '',
  );

describe("The Assistant's sources", () => {
  it('are found', () => {
    expect(sources).toContain('gathering/meal-plan.service.ts');
  });

  it('import neither the position store, the visibility rule, nor the location sharing service', () => {
    const offending = sources.flatMap((path) =>
      importedPaths(readFileSync(join(ASSISTANT, path), 'utf8'))
        .filter((imported) => FORBIDDEN.some((name) => imported.includes(`location-sharing/${name}`)))
        .map((imported) => `${path}: ${imported}`),
    );

    expect(offending).toEqual([]);
  });
});

// findFriend and what it draws, which answer where a Friend is.
const FIND_FRIEND = ['lookup/friend-tools.ts', 'lookup/friend.service.ts', 'lookup/friend-lookup.ts'];

// What findFriend may read from outside the Assistant: the Friend view, the Places it names, and the walk between
// Places (the walking table, which holds no one's position).
const FIND_FRIEND_READS = new Set([
  '@nestjs/common',
  'zod',
  '../../friends/friend-view.service.js',
  '../../friends/dto/friend-view.dto.js',
  '../../places/place-lookup.js',
  '../../places/dto/place.dto.js',
  '../../common/geometry.js',
  '../../travel/travel.js',
]);

describe("findFriend's sources", () => {
  it('read a Friend only through the Friend view', () => {
    const outside = FIND_FRIEND.flatMap((path) =>
      importedPaths(readFileSync(join(ASSISTANT, path), 'utf8')).filter(
        (imported) => !imported.startsWith('./') && !/^\.\.\/(?!\.\.\/)/u.test(imported),
      ),
    );

    expect(outside).toContain('../../friends/friend-view.service.js');
    expect(outside.filter((imported) => !FIND_FRIEND_READS.has(imported))).toEqual([]);
  });
});
