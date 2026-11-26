/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('posthog-node', () => {
  it('is imported by src/usage/usage.service.ts only', () => {
    const src = fileURLToPath(new URL('../src', import.meta.url));
    const files = readdirSync(src, { recursive: true, encoding: 'utf8' }).filter((file) => /\.[cm]?tsx?$/u.test(file));
    const importers = files.filter((file) =>
      /\bfrom\s+['"]posthog-node(?:\/[^'"]*)?['"]|\bimport\(\s*['"]posthog-node|\brequire\(\s*['"]posthog-node/u.test(
        readFileSync(join(src, file), 'utf8'),
      ),
    );

    expect(importers.map((file) => relative(src, join(src, file)).replaceAll('\\', '/'))).toEqual([
      'usage/usage.service.ts',
    ]);
  });
});
