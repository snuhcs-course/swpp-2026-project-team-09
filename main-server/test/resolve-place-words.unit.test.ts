/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { exactlyNamed } from '../src/assistant/tools/resolve-place.js';

// Which of the Places the search matched resolvePlace answers: the one named exactly the User's words, or numbered
// by them, when there is exactly one, else all of them. Places chosen by hand.

const place = (name: string, number: string | null = null): { name: string; number: string | null } => ({
  name,
  number,
});

describe('The Places resolvePlace answers', () => {
  it('are the one named exactly the words, though another holds them (문화관, not 해동학술문화관)', () => {
    const cultureHall = place('문화관', '73');

    expect(exactlyNamed('문화관', [cultureHall, place('해동학술문화관', '220')])).toEqual([cultureHall]);
  });

  it('match the name ignoring case', () => {
    const named = place('LG연구동');

    expect(exactlyNamed('lg연구동', [named, place('LG연구동 별관')])).toEqual([named]);
  });

  it('are the one numbered by the words, written with 동', () => {
    const numbered = place('SK경영관', '58');

    expect(exactlyNamed('58동', [numbered, place('58동 카페')])).toEqual([numbered]);
  });

  it('are all that matched when two are named exactly the words', () => {
    const matched = [place('문화관', '73'), place('문화관', '99'), place('해동학술문화관', '220')];

    expect(exactlyNamed('문화관', matched)).toEqual(matched);
  });

  it('are all that matched when none is named exactly the words', () => {
    const matched = [place('제1공학관', '301'), place('제2공학관', '302')];

    expect(exactlyNamed('공학관', matched)).toEqual(matched);
  });
});
