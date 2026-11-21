/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { toMineCards } from '@/features/party/mine';
import { ME, NOW, quest } from '../support/map-sources';

// A 파티 card's next step (P05 ticket 13): a step that takes the 파티's own title is its place alone. In the usage test
// the card said "민수랑 학생회관에서 만나기 · 학생회관".

const NOTHING = { myParty: null, parties: [], declined: [], invited: {}, meId: ME.id, now: NOW, past: [] };

function cardWhat(title: string, step: string): string | undefined {
  const made = quest('made', { title });
  const [first] = made.subQuests;
  if (first === undefined) {
    throw new Error('No step');
  }
  const cards = toMineCards({ ...NOTHING, quests: [{ ...made, subQuests: [{ ...first, title: step }] }] });
  return cards[0]?.next?.what;
}

describe("A 파티 card's next step", () => {
  it("is its place alone when it takes the 파티's title", () => {
    expect(cardWhat('민수랑 정문에서 만나기', '민수랑 정문에서 만나기')).toBe('301동 앞');
  });

  it('is the step and its place otherwise', () => {
    expect(cardWhat('저녁 약속', '저녁')).toBe('저녁 · 301동 앞');
  });
});
