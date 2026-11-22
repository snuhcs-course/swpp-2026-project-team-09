/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { vi } from 'vitest';
import { NO_CONTEXT, requestContextSchema } from '../src/assistant/dto/answer.dto.js';
import { type ClientCapability, type ToolContext } from '../src/assistant/feature.js';
import { FoundIds } from '../src/assistant/found-ids.js';
import { foundWithMentions, friendMentions, mentionLines } from '../src/assistant/mentions.js';
import { messagesFor } from '../src/assistant/run-messages.js';
import { resolveFriend } from '../src/assistant/tools/resolve-friend.js';
import { type FriendView } from '../src/friends/dto/friend-view.dto.js';

// The "@" mention of a Friend in the User's message: the app sends the Friends by id, the server keeps only the
// asker's Friends, the model reads them as a line after the message, and resolveFriend takes a mentioned Friend over
// another of the same name. Friends chosen by hand, over a stand-in Friend view.

const friendOf = (id: string, name: string, department: string): FriendView => ({
  id,
  name,
  department,
  friendId: 'FRIEND01',
  friendsSince: '2073-01-01T09:00:00+09:00',
  level: 'timetable',
  position: null,
  placeId: null,
});

const MIN_SU_CS = friendOf('6f1c1d0e-6a43-4a43-9a43-1a1d1f0e0001', '김민수', '컴퓨터공학부');
const MIN_SU_BIZ = friendOf('6f1c1d0e-6a43-4a43-9a43-1a1d1f0e0002', '김민수', '경영학과');
const JI_EUN = friendOf('6f1c1d0e-6a43-4a43-9a43-1a1d1f0e0003', '박지은', '물리천문학부');
const STRANGER = '6f1c1d0e-6a43-4a43-9a43-1a1d1f0e0009';

const friends = { list: vi.fn(() => Promise.resolve([MIN_SU_CS, MIN_SU_BIZ, JI_EUN])) };

function contextOf(mentions: { userId: string; name: string }[]): ToolContext {
  return {
    userId: 'asker',
    now: new Date('2073-01-03T11:50:00+09:00'),
    context: { ...NO_CONTEXT, mentions },
    capabilities: new Set<ClientCapability>(['answer']),
    found: new FoundIds(),
    shown: null,
    presented: { mapButtons: [], cards: [], proposal: null, answer: null, lookup: null, refusal: null },
    judged: new Map(),
    restaurants: new Map(),
  };
}

describe('the mentions a request carries', () => {
  it('are left out by an app before the mention, and taken as ids and names', () => {
    expect(requestContextSchema.parse({})).not.toHaveProperty('mentions');
    expect(requestContextSchema.parse({ mentions: [{ userId: JI_EUN.id, name: '박지은' }] }).mentions).toEqual([
      { userId: JI_EUN.id, name: '박지은' },
    ]);
  });

  it('refuse an id that is not a User id', () => {
    expect(requestContextSchema.safeParse({ mentions: [{ userId: 'kim', name: '김민수' }] }).success).toBe(false);
  });
});

describe('the mentions the server keeps', () => {
  beforeEach(() => {
    friends.list.mockClear();
  });

  it('drop an id that is not a Friend of the asker, count a Friend once, and take the Friend’s own name', async () => {
    const kept = await friendMentions(friends, 'asker', [
      { userId: STRANGER, name: '김민수' },
      { userId: MIN_SU_BIZ.id, name: '민수' },
      { userId: MIN_SU_BIZ.id, name: '김민수' },
    ]);

    expect(kept).toEqual([{ userId: MIN_SU_BIZ.id, name: '김민수' }]);
    expect(friends.list).toHaveBeenCalledWith('asker');
  });

  it('look no Friend up for a message without one', async () => {
    expect(await friendMentions(friends, 'asker')).toEqual([]);
    expect(await friendMentions(friends, 'asker', [])).toEqual([]);
    expect(friends.list).not.toHaveBeenCalled();
  });
});

describe('the line the model reads', () => {
  const mentions = [{ userId: MIN_SU_BIZ.id, name: '김민수' }];

  it('names each mentioned Friend by id after the User’s message, in an app that draws answers or not', () => {
    const line = `[Mentioned with @: friend ${MIN_SU_BIZ.id} <data label="friend.name">김민수</data>]`;
    expect(mentionLines(mentions)).toEqual([line]);

    const request = { userId: 'asker', now: new Date(), capabilities: [], context: { ...NO_CONTEXT, mentions } };
    const [message] = messagesFor([{ role: 'user', text: '@김민수 랑 밥' }], request);

    expect(message?.content).toBe(`@김민수 랑 밥\n\n${line}`);
  });

  it('is none without a mention', () => {
    expect(mentionLines()).toEqual([]);
    expect(mentionLines([])).toEqual([]);
  });
});

describe('resolveFriend with a Friend mentioned', () => {
  const tool = resolveFriend(friends);

  it('answers the mentioned Friend alone, never the other Friend of the same name', async () => {
    const answer = await tool.run({ name: '김민수' }, contextOf([{ userId: MIN_SU_BIZ.id, name: '김민수' }]));

    expect(answer).toMatchObject({ result: 'one', candidate: { id: MIN_SU_BIZ.id } });
  });

  it('still asks which one when the words fit Friends none of whom was mentioned', async () => {
    const answer = await tool.run({ name: '김민수' }, contextOf([{ userId: JI_EUN.id, name: '박지은' }]));

    expect(answer).toMatchObject({ result: 'several' });
  });
});

describe("a run's tools with a Friend mentioned", () => {
  it('take the mentioned id from the start, as a resolver had answered it alone, and no other', () => {
    const found = foundWithMentions([{ userId: MIN_SU_BIZ.id, name: '김민수' }]);

    expect(found.has('friend', MIN_SU_BIZ.id)).toBe(true);
    expect(found.has('friend', MIN_SU_CS.id)).toBe(false);
  });
});
