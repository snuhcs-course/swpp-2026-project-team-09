/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { NO_CONTEXT, type RequestContext } from '../src/assistant/dto/answer.dto.js';
import { type ClientCapability, type ToolContext } from '../src/assistant/feature.js';
import { FoundIds } from '../src/assistant/found-ids.js';
import { resolveFriend } from '../src/assistant/tools/resolve-friend.js';
import { type FriendView } from '../src/friends/dto/friend-view.dto.js';

// resolveFriend as the model calls it, over a stand-in Friend view (P01-20): the input the model reads, and what an
// app that draws answers is given for one Friend, for several, and with a Friend tapped. Friends chosen by hand.

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

const KIM = friendOf('kim', '김민수', '컴퓨터공학부');
const LEE = friendOf('lee', '이민수', '경영학과');
const JIEUN = friendOf('jieun', '박지은', '물리천문학부');

const tool = resolveFriend({ list: () => Promise.resolve([KIM, LEE, JIEUN]) });

// An app that draws answers, with that Friend tapped or none.
function contextOf(tapped: RequestContext['tapped']): ToolContext {
  return {
    userId: 'asker',
    now: new Date('2073-01-03T11:50:00+09:00'),
    context: { ...NO_CONTEXT, tapped },
    capabilities: new Set<ClientCapability>(['library', 'answer']),
    found: new FoundIds(),
    shown: null,
    presented: { mapButtons: [], cards: [], proposal: null, answer: null, lookup: null, refusal: null },
    judged: new Map(),
    restaurants: new Map(),
  };
}

describe("resolveFriend's input", () => {
  it('reads to the model, as the SDK converts it, as an optional forTool string of at most 50 characters', () => {
    expect(z.toJSONSchema(tool.input, { target: 'draft-7', io: 'input' })).toMatchObject({
      properties: { forTool: { type: 'string', maxLength: 50 } },
      required: ['name'],
    });
  });

  it('leaves out a forTool it cannot take, as when none is given', () => {
    for (const forTool of [null, 3, 'x'.repeat(51)]) {
      expect(tool.input.parse({ name: '민수', forTool })).toEqual({ name: '민수' });
    }
  });
});

describe('resolveFriend in an app that draws answers', () => {
  it('answers words that fit one Friend by id and full name only, with no note, and puts no question in the reply', async () => {
    const context = contextOf(null);

    const answer = await tool.run({ name: '지은', forTool: 'planMeal' }, context);

    expect(answer).toStrictEqual({
      result: 'one',
      candidate: { id: 'jieun', name: '<data label="friend.name">박지은</data>' },
    });
    expect(context.presented.refusal).toBeNull();
  });

  it('keeps the department in each candidate of a several, to tell them apart', async () => {
    const answer = await tool.run({ name: '민수' }, contextOf(null));

    expect(answer).toMatchObject({
      candidates: [
        { id: 'kim', department: '<data label="friend.department">컴퓨터공학부</data>' },
        { id: 'lee', department: '<data label="friend.department">경영학과</data>' },
      ],
    });
  });

  it('still answers several when the tapped Friend is not among those the words fit', async () => {
    const context = contextOf({ kind: 'friend', userId: 'jieun' });

    const answer = await tool.run({ name: '민수', forTool: 'planMeal' }, context);

    expect(answer).toMatchObject({ result: 'several', candidates: [{ id: 'kim' }, { id: 'lee' }] });
    expect(context.presented.refusal).toMatchObject({ kind: 'which-friend' });
  });

  it('answers the tapped Friend alone when the words fit them among others', async () => {
    const context = contextOf({ kind: 'friend', userId: 'lee' });

    const answer = await tool.run({ name: '민수' }, context);

    expect(answer).toMatchObject({ result: 'one', candidate: { id: 'lee' } });
    expect(context.presented.refusal).toBeNull();
  });
});
