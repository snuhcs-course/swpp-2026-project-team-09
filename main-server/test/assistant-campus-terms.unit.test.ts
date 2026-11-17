/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { CAMPUS_TERMS, CAMPUS_TERMS_RULES, campusTermsRules } from '../src/assistant/campus-terms.js';

// The campus short names are data, rendered into a fragment of the chat's system prompt (P15 ticket 51).

describe('The campus short names', () => {
  it('render every short name with what it means', () => {
    for (const { shortNames, means, note } of CAMPUS_TERMS) {
      expect(CAMPUS_TERMS_RULES).toContain(`- ${shortNames.join(', ')}: ${means}.`);
      for (const name of shortNames) {
        expect(CAMPUS_TERMS_RULES).toContain(name);
      }
      if (note !== undefined) {
        expect(CAMPUS_TERMS_RULES).toContain(note);
      }
    }
  });

  it('hold the first entries', () => {
    expect(CAMPUS_TERMS.flatMap(({ shortNames }) => shortNames)).toEqual([
      '학관',
      '윗공대',
      '아랫공대',
      '과방',
      '버들골',
      '풍산마당',
      '긱사',
      '긱',
      '천식',
      '종운',
      '긱운',
      '긱삼',
      '중도',
    ]);
  });

  it('change by one line, and only that, when an entry is added', () => {
    const added = campusTermsRules([
      ...CAMPUS_TERMS,
      { shortNames: ['예시'], means: '예시관 (999동)', note: 'An example.' },
    ]);

    expect(added).toContain('- 예시: 예시관 (999동). An example.');
    expect(added.replace('\n- 예시: 예시관 (999동). An example.', '')).toBe(CAMPUS_TERMS_RULES);
  });
});
