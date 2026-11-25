/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { toMineCards } from '@/features/party/mine';
import { ME, NOW, quest } from '../support/map-sources';

// A 파티 card's "when · where" (A04 ticket 04): the next step's time and its place, "장소 미정" without one. The step's
// own title is not on the card.

const NOTHING = { myParty: null, parties: [], declined: [], meId: ME.id, now: NOW, past: [] };

function cardLine(place: 'kept' | 'none'): string | undefined {
  const made = quest('made', { title: '저녁 약속' });
  const [first] = made.subQuests;
  if (first === undefined) {
    throw new Error('No step');
  }
  const step = place === 'kept' ? first : { ...first, place: null };
  const cards = toMineCards({ ...NOTHING, quests: [{ ...made, subQuests: [step] }] });
  return cards[0]?.line;
}

describe("A 파티 card's when · where", () => {
  it("ends with the next step's place", () => {
    expect(cardLine('kept')).toMatch(/ · 301동 앞$/u);
  });

  it('reads 장소 미정 without a place', () => {
    expect(cardLine('none')).toMatch(/ · 장소 미정$/u);
  });
});
