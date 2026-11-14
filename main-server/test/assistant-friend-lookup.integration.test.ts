/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type AnswerReply, type Lookup } from '../src/assistant/dto/answer.dto.js';
import { FRIEND_RULES } from '../src/assistant/lookup/friend-tools.js';
import { signInUser } from './friends.js';
import { expectStatus, keptButHidden, keptPositionIn, setMasterSwitch, uploadPosition } from './location-sharing.js';
import { MealPlanStage, type Named, resolve } from './meal-plan.js';
import { type Step } from './scripted-model.js';

// Where a Friend is, drawn on the map as a Lookup, at the Assistant's endpoint with the scripted model and the seed's
// Places: 민수, with a Class in 302동 from 11:00 to 12:15 on a Tuesday, seen at his exact location and at the Timetable
// only (boards q5 and q7), what reaches the model and the reply of a position the Friend view does not show, a User
// who is not a Friend, and an app that does not draw answers. The Friend view gives no building level yet, so that
// level is tested on the pure answer.

const stage = new MealPlanStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const replySchema = z.object({
  text: z.string(),
  answer: z.custom<AnswerReply | null>(),
  lookup: z.custom<Lookup | null>(),
});

function lookupIn(body: unknown): Lookup {
  const { lookup } = replySchema.parse(body);
  if (lookup === null) {
    throw new Error('The reply has no Lookup');
  }
  return lookup;
}

const findFriend = (friendId: string): Step => ({ tool: 'findFriend', input: { friendId } });

// The rule of the chat that does not draw answers, word for word.
const NO_POSITIONS =
  '- You cannot see where anyone is. When asked where a Friend is, tell the User to look at the map in the app.';

async function minsuAt(date: string, clock: string): Promise<Named> {
  await stage.asking(date, clock);
  const minsu = await stage.friend('민수');
  await stage.classAt(minsu, '11:00', '12:15', '302');
  return minsu;
}

describe('민수 at the Timetable only (board q7)', () => {
  it("is drawn dashed at his Class's Place during the Class, and nothing of his kept position goes anywhere", async () => {
    const minsu = await minsuAt('2082-01-06', '12:05');
    await keptButHidden(stage.app, stage.asker, minsu);
    const place302 = await stage.numbered('302');

    const response = await stage.send([
      resolve('민수'),
      findFriend(minsu.id),
      { text: '민수는 12:15까지 302동 수업이에요.' },
    ]);

    const lookup = lookupIn(response.body);
    expect(lookup.scene.people).toEqual([
      {
        userId: minsu.id,
        name: '민수',
        me: false,
        at: { latitude: place302.latitude, longitude: place302.longitude },
        source: 'timetable',
        tag: '민수 · 수업 중 12:15까지',
      },
    ]);
    expect(lookup.lines).toEqual([
      [
        { text: '민수는 ', strong: false },
        { text: '12:15까지 302동 수업', strong: true },
        { text: '이에요', strong: false },
      ],
      [{ text: '지금 위치는 보여 주지 않아요', strong: false }],
    ]);
    expect(stage.model.toolResults()[1]).toEqual({
      result: 'found',
      name: '<data label="friend.name">민수</data>',
      shows: 'Timetable only',
      place: '302동',
      classUntil: '12:15',
      classEnded: null,
      timetable: null,
    });
    expect(keptPositionIn(stage.model.toolResults(), stage.model.received(), response.body)).toEqual([]);
  });
});

describe('민수 at the Timetable only, after his last Class', () => {
  it('is not drawn after the 15 minutes past it, and is his Timetable label', async () => {
    const minsu = await minsuAt('2082-01-13', '14:00');

    const response = await stage.send([resolve('민수'), findFriend(minsu.id), { text: '…' }]);

    const lookup = lookupIn(response.body);
    expect(lookup.scene.people).toEqual([]);
    expect(lookup.lines).toEqual([
      [
        { text: '민수', strong: true },
        { text: ' · 오늘 수업 끝', strong: false },
      ],
    ]);
    expect(lookup.actions).toEqual([{ kind: 'meet', userId: minsu.id }]);
  });
});

describe('민수 at his exact location (board q5)', () => {
  it('is drawn where he is, tagged with the Place he is in', async () => {
    const minsu = await minsuAt('2082-01-20', '12:30');
    await expectStatus(setMasterSwitch(stage.app, stage.asker, true), 204);
    await expectStatus(setMasterSwitch(stage.app, minsu, true), 204);
    const { latitude, longitude } = await stage.numbered('63');
    await expectStatus(uploadPosition(stage.app, minsu, { latitude, longitude }), 200);

    const response = await stage.send([resolve('민수'), findFriend(minsu.id), { text: '…' }]);

    const lookup = lookupIn(response.body);
    expect(lookup.scene.people).toEqual([
      { userId: minsu.id, name: '민수', me: false, at: { latitude, longitude }, source: 'exact', tag: '민수 · 63동' },
    ]);
    expect(lookup.lines).toEqual([
      [
        { text: '민수', strong: true },
        { text: '는 지금 63동에 있어요', strong: false },
      ],
    ]);
    expect(lookup.basis).toEqual(['민수는 내게 정확한 위치를 보여 줘요']);
  });
});

describe('A User who is not a Friend of the asker', () => {
  it('is refused when no resolver returned the id, and nothing is drawn', async () => {
    const minsu = await minsuAt('2082-01-27', '12:05');

    const response = await stage.send([findFriend(minsu.id), { text: '…' }]);

    expect(JSON.stringify(stage.model.toolResults()[0])).toContain('No tool returned these ids');
    expect(replySchema.parse(response.body).lookup).toBeNull();
  });

  it('is answered none when the User tapped them, and nothing is drawn', async () => {
    await stage.asking('2082-02-03', '12:05');
    const stranger = await signInUser(stage.app);

    const response = await stage.send([findFriend(stranger.id), { text: '…' }], {
      context: { tapped: { kind: 'friend', userId: stranger.id } },
    });

    expect(stage.model.toolResults()[0]).toMatchObject({ result: 'none' });
    expect(replySchema.parse(response.body).lookup).toBeNull();
  });
});

// The names of the tools the model was offered on its first call.
const toolNames = (): string[] => (stage.model.received()[0]?.tools ?? []).map(({ name }) => name);

describe('An app that does not draw answers', () => {
  it('is not offered findFriend, and is still told to send the User to the map', async () => {
    await stage.asking('2082-02-10', '12:05');

    await stage.send([{ text: '네' }], { clientCapabilities: ['library'] });

    expect(toolNames()).not.toContain('findFriend');
    expect(stage.model.system()).not.toContain(FRIEND_RULES);
    expect(stage.model.system()).toContain(NO_POSITIONS);
  });

  it('is told apart from one that does, which is offered findFriend with its rules instead', async () => {
    await stage.asking('2082-02-10', '12:05');

    await stage.send([{ text: '네' }]);

    expect(toolNames()).toContain('findFriend');
    expect(stage.model.system()).toContain(FRIEND_RULES);
    expect(stage.model.system()).not.toContain('You cannot see where anyone is');
  });
});
