/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { loadCases } from '../eval/cases.ts';
import { withCurrentLabels } from '../eval/relabel.ts';

// A saved run scored against the case files' labels as they are now (P13 ticket 04, `pnpm eval:score --revised`): the
// labels a run recorded are replaced by the current ones, and nothing else of the run changes. A harness test, reported
// apart from the product's pyramid (ADR 0007). It reads the case files; no app, no model.

const cases = loadCases();

function savedRun(id: string): { name: string; cases: Record<string, unknown>[] } {
  return {
    name: 'a run',
    cases: [
      {
        id,
        category: 'p6-spaces',
        repetition: 2,
        knownFailure: null,
        expect: { old: true },
        turnExpects: [{ old: true }],
        turns: ['kept'],
      },
    ],
  };
}

describe('A saved run with the current labels', () => {
  it("replaces each case's recorded labels by the case file's, keeping the run", () => {
    const relabelled = withCurrentLabels(savedRun('p6-spaces-alias-imac'), cases) as ReturnType<typeof savedRun>;
    const [run] = relabelled.cases;
    const current = cases.find(({ id }) => id === 'p6-spaces-alias-imac');

    expect(relabelled.name).toBe('a run');
    expect(run).toMatchObject({ id: 'p6-spaces-alias-imac', repetition: 2, turns: ['kept'], knownFailure: null });
    expect(run?.expect).toEqual(current?.expect);
    expect(run?.turnExpects).toEqual([null]);
    expect(JSON.stringify(run?.expect)).toContain('"seat":"Media Carrel A"');
  });

  it('refuses a run whose case is in no case file', () => {
    expect(() => withCurrentLabels(savedRun('p6-no-such-case'), cases)).toThrow(
      'The case p6-no-such-case of the run is in no case file',
    );
  });
});
