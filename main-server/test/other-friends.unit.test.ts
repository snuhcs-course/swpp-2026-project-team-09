/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type FriendView } from '../src/friends/dto/friend-view.dto.js';
import { otherFriendsOf } from '../src/assistant/gathering/other-friends.js';
import { walks } from './gathering-fixtures.js';

// The asker's other Friends for picking (P04 ticket 64): a Friend's walk to the Plan's Place, known, hidden by the
// location level, and from a Place the walking table has no row for. Expected values: 120 seconds from 'A' to 'P'.

function friendAt(level: FriendView['level'], placeId: string | null): FriendView {
  return {
    id: `friend-${String(placeId)}-${level}`,
    name: '김태현',
    department: '컴퓨터공학부',
    friendId: 'KT0000AA',
    friendsSince: '2026-10-01T09:00:00+09:00',
    level,
    position: null,
    placeId,
  };
}

const days = { itemsOn: (): Promise<never[]> => Promise.resolve([]) };
const travel = walks(['A', 'P', 120]);

async function walkOf(friend: FriendView): Promise<number | null> {
  const [other] = await otherFriendsOf([friend], '2026-11-25', { days, travel });
  return other?.walkTo('P') ?? null;
}

describe("An other Friend's walk to the Plan's Place", () => {
  it('is the walking table’s minutes from the Place the Friend is in', async () => {
    await expect(walkOf(friendAt('building', 'A'))).resolves.toBe(2);
  });

  it('is unknown where the location level shows no Place', async () => {
    await expect(walkOf(friendAt('timetable', null))).resolves.toBeNull();
  });

  it('is unknown from a Place the walking table has no row for, rather than failing the answer', async () => {
    await expect(walkOf(friendAt('building', 'NEW'))).resolves.toBeNull();
  });
});
