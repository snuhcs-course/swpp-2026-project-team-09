/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type { Quest } from '@/api/types';
import { type MineCardView, toMineCards } from '@/features/party/mine';
import { ME, NOW, quest } from '../support/map-sources';

// A 파티 card's time and place (A04 ticket 04), each on its own line since P06 ticket 18: the next step's time, and
// its place, "장소 미정" without one. The step's own title is not on the card.

const NOTHING = { myParty: null, parties: [], declined: [], meId: ME.id, now: NOW, past: [] };

function cardOf(made: Quest): MineCardView | undefined {
  return toMineCards({ ...NOTHING, quests: [made] })[0];
}

function withPlace(place: 'kept' | 'none'): MineCardView | undefined {
  const made = quest('made', { title: '저녁 약속' });
  const [first] = made.subQuests;
  if (first === undefined) {
    throw new Error('No step');
  }
  return cardOf({ ...made, subQuests: [place === 'kept' ? first : { ...first, place: null }] });
}

describe("A 파티 card's time and place", () => {
  it("has the next step's time and its place apart", () => {
    expect(withPlace('kept')).toMatchObject({ time: '17:40 · 4시간 후', place: '301동 앞' });
  });

  it('reads 장소 미정 without a place', () => {
    expect(withPlace('none')?.place).toBe('장소 미정');
  });
});
