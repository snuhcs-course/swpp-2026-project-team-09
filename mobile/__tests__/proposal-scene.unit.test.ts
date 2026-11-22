/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { QuestProposal } from '@/api/assistant-types';
import type { Place } from '@/api/types';
import { drawingOfScene } from '@/features/assistant/answer-marks';
import { proposalPlaceOf, proposalScene, proposalSetting } from '@/features/assistant/proposal-scene';

// The scene the app makes for a Proposal (P04 ticket 06), and how it is drawn.

const UNION: Place = { id: 'place-63', number: '63', name: '학생회관', latitude: 37.45932, longitude: 126.95058 };
const ME = { latitude: 37.4512, longitude: 126.9526 };
const MINJUN = { latitude: 37.45952, longitude: 126.95209 };
// 13:00 on Monday 2026-10-05 in Korea.
const NOW = new Date('2026-10-05T13:00:00+09:00');

const PROPOSAL: QuestProposal = {
  title: '학생회관에서 만나요',
  description: '',
  joinPolicy: 'open',
  board: 'hobby',
  capacity: 4,
  startsAt: '2026-10-06T14:00:00+09:00',
  place: { id: 'place-63', name: '학생회관', booking: null },
  globalEvent: null,
  invitees: [
    { id: 'f1', name: '김민준' },
    { id: 'f2', name: '이서연' },
  ],
};

describe('where a Proposal meets', () => {
  it('is its Place found in the list of Places', () => {
    expect(proposalPlaceOf(PROPOSAL, [UNION])).toEqual({
      placeId: 'place-63',
      label: '학생회관',
      latitude: UNION.latitude,
      longitude: UNION.longitude,
    });
  });

  it('is none for a Place not in the list, and for a Proposal without one, as one for a Global Event', () => {
    expect(proposalPlaceOf(PROPOSAL, [])).toBeNull();
    expect(proposalPlaceOf({ ...PROPOSAL, place: null }, [UNION])).toBeNull();
  });
});

describe("a Proposal's scene", () => {
  const place = { placeId: 'place-63', label: '학생회관', latitude: UNION.latitude, longitude: UNION.longitude };

  it('has its flag, the User with a walk there, and the invited Friends whose position is known', () => {
    const scene = proposalScene({ proposal: PROPOSAL, place }, ME, new Map([['f1', MINJUN]]));

    expect(scene.places).toEqual([{ place, role: 'pick', tag: '학생회관에서 만나요 ›' }]);
    expect(scene.people.map(({ userId, me, at }) => ({ userId, me, at }))).toEqual([
      { userId: 'me', me: true, at: ME },
      { userId: 'f1', me: false, at: MINJUN },
    ]);
    expect(scene.routes).toEqual([
      expect.objectContaining({ role: 'me', from: ME, to: { latitude: place.latitude, longitude: place.longitude } }),
    ]);
  });

  it('draws the flag with its title, and its start with the day word and who sees it', () => {
    const scene = proposalScene({ proposal: PROPOSAL, place }, ME, new Map());
    const drawing = drawingOfScene(scene, null, proposalSetting(PROPOSAL, NOW));
    const flag = drawing.things.find(({ id }) => id === 'answer:pick');

    expect(flag?.name).toBe('학생회관에서 만나요 › · 내일(화) 14:00 · 공개');
    expect(drawing.lines).toHaveLength(1);
  });

  it('says 비공개 for a closed Proposal and draws no walk without the User', () => {
    const closed = { ...PROPOSAL, joinPolicy: 'closed' as const, board: null };
    const scene = proposalScene({ proposal: closed, place }, null, new Map());
    const drawing = drawingOfScene(scene, null, proposalSetting(closed, NOW));

    expect(drawing.things.find(({ id }) => id === 'answer:pick')?.name).toContain('14:00 · 비공개');
    expect(drawing.lines).toHaveLength(0);
    expect(scene.people).toHaveLength(0);
  });
});
