/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { toCards } from '@/features/map/adapter';
import { toMineCards } from '@/features/party/mine';
import { ALONE_CAPACITY, toQuestRows } from '@/features/quests/adapter';
import { ME, NOW, quest, sources } from '../support/map-sources';

// A Quest held alone, as "여기로" makes one (P03 ticket 15, capacity 1), is never a 파티: 내 파티 leaves it out, and the
// Quest list and the everyday map call it a 퀘스트. A 비공개 파티 the User holds alone so far, its Friends not yet in,
// keeps its words.

const TAKEN = quest('taken', { title: '채용박람회', capacity: ALONE_CAPACITY });
const PARTY = quest('party', { title: '302동식당에서 점심' });
const NOTHING = { myParty: null, parties: [], declined: [], invited: {}, meId: ME.id, now: NOW };

// Partitions: a Quest held alone, now and past; a 비공개 파티 held alone so far.
describe('내 파티', () => {
  it('leaves out a Quest held alone, now and past, and keeps a 비공개 파티', () => {
    const cards = toMineCards({ ...NOTHING, quests: [TAKEN, PARTY], past: [{ ...TAKEN, id: 'taken-before' }] });

    expect(cards.map(({ questId }) => questId)).toEqual(['party']);
  });
});

// Partitions: a Quest held alone; a 비공개 파티 held alone so far.
describe('the Quest list', () => {
  it('calls a Quest held alone a 퀘스트, and a 비공개 파티 still one', () => {
    const rows = toQuestRows({ quests: [TAKEN, PARTY], myParty: null, parties: [], meId: ME.id, now: NOW });

    expect(rows.map(({ id, kicker, label }) => [id, kicker, label])).toEqual([
      ['taken', '퀘스트', '퀘스트'],
      ['party', '비공개 파티', '비공개 파티'],
    ]);
  });
});

// Partitions: a Quest held alone; a 비공개 파티 held alone so far.
describe('the everyday map', () => {
  it("words a Quest held alone's card as a 퀘스트, and a 비공개 파티's as one", () => {
    const cards = toCards(sources({ quests: [TAKEN, PARTY] }));

    expect(cards.map(({ id, subLabel }) => [id, subLabel])).toEqual([
      ['party:taken', '퀘스트'],
      ['party:party', '비공개 파티'],
    ]);
  });
});
