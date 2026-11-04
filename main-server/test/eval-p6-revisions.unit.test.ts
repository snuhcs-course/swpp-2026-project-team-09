/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { z } from 'zod';
import { casesIn, loadCases } from '../eval/cases.ts';

// The P6 labels revised after R1 (P13 ticket 04), in the P5 form: each revision in suite.yaml names a case of the suite,
// what it revises and why, and the case files hold the revised label. A harness test, reported apart from the
// product's pyramid (ADR 0007). It reads the suite's files; no app, no model.

const revisionSchema = z.strictObject({
  case: z.string(),
  revises: z.string().min(1),
  was: z.unknown(),
  now: z.unknown(),
  reason: z.string().min(1),
  declared: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u),
});

const { revisions } = z
  .looseObject({ revisions: z.array(revisionSchema) })
  .parse(parse(readFileSync(new URL('../eval/p6/suite.yaml', import.meta.url), 'utf8')));
const cases = new Map(casesIn(loadCases(), 'p6').map((evalCase) => [evalCase.id, evalCase]));

describe('The revised P6 labels', () => {
  it('enter each revision with revises and reason, for a case of the suite', () => {
    expect(revisions.map(({ case: id }) => id)).toEqual([
      'p6-spaces-alias-imac',
      'p6-common-free-time-not-library',
      'p6-tutorial-exhibition-today',
      'p6-tutorial-health-clinic',
    ]);
    expect(revisions.filter(({ case: id }) => !cases.has(id))).toEqual([]);
  });

  it('expect the named room in seat, and forbid the library tools in the three tool revisions', () => {
    const [imacCard] = cases.get('p6-spaces-alias-imac')?.expect?.cards ?? [];
    expect(imacCard?.conditions).toMatchObject({ seat: 'Media Carrel A' });
    expect(imacCard?.conditions).not.toHaveProperty('equipment');

    for (const id of ['p6-common-free-time-not-library', 'p6-tutorial-exhibition-today', 'p6-tutorial-health-clinic']) {
      const tools = cases.get(id)?.expect?.tools;
      expect(tools?.only).toBe(true);
      expect(tools?.forbidden).toEqual(expect.arrayContaining(['findLibrarySpace', 'proposeLibraryBooking']));
    }
    expect(cases.get('p6-common-free-time-not-library')?.expect?.tools.allowed).toEqual(['getMyDay']);
    expect(cases.get('p6-tutorial-health-clinic')?.expect?.tools.allowed).toEqual(['resolvePlace']);
    expect(cases.get('p6-tutorial-exhibition-today')?.expect?.tools.required).toContain('showGlobalEvents');
  });
});
