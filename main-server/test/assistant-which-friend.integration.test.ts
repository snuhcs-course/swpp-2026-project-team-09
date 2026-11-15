/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { QUESTION_SHOWN } from '../src/assistant/refusals/friend-question.js';
import { postAssistantMessages } from './assistant.js';
import { MealPlanStage, type Named, planMeal, resolve } from './meal-plan.js';
import { type Step } from './scripted-model.js';

// The question of which Friend (P01-20) at the Assistant's endpoint with the scripted model: when the User's words fit
// several Friends, the reply of an app that draws answers carries a which-friend refusal whose offers are the
// candidates, and a press on one sends their name with them tapped, which no guard refuses. Each test asks on a
// Tuesday of 2073, which no other file uses, as a new User.

const stage = new MealPlanStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const RESTAURANTS = ['301동식당', '302동식당', '학생회관식당', '3식당', '자하연식당 2층'];

const replySchema = z.object({
  text: z.string(),
  answer: z.unknown(),
  lookup: z.unknown(),
  refusal: z.unknown(),
});

type Reply = z.infer<typeof replySchema>;

const line = (text: string): { text: string; strong: boolean }[] => [{ text, strong: false }];

const cell = ({ id, name }: Named, department: string): object => ({
  kind: 'pick-friend',
  userId: id,
  label: name,
  aside: department,
  text: name,
});

const resolveFor = (name: string, forTool: string): Step => ({ tool: 'resolveFriend', input: { name, forTool } });

// The model writes nothing after a question the app shows, as its rules say.
const SILENT: Step = { text: '' };

// A Friend's name and department.
type Person = [string, string];

const KIM_CS: Person = ['김민수', '컴퓨터공학부'];
const LEE_BIZ: Person = ['이민수', '경영학과'];
const KIM_BIZ: Person = ['김민수', '경영학과'];

// The asker and two Friends of those names and departments, on a lunch with menus, each with a Class until 12:15.
async function twoFriends(date: string, first: Person, second: Person): Promise<[Named, Named]> {
  await stage.asking(date, '11:50');
  await stage.menusOn(date, RESTAURANTS);
  await stage.classAt(stage.asker, '11:00', '11:50', '301');
  const friendOf = async ([name, department]: Person): Promise<Named> => {
    const friend = await stage.friend(name, department);
    await stage.classAt(friend, '11:00', '12:15', '302');
    return friend;
  };
  return [await friendOf(first), await friendOf(second)];
}

async function replyTo(steps: Step[], words: string, more: object = {}): Promise<Reply> {
  const response = await stage.send(steps, more, words);
  expect(response.status).toBe(200);
  return replySchema.parse(response.body);
}

// The User's press on a cell: the conversation so far, and the cell's words with its Friend tapped.
async function pressed(steps: Step[], before: [string, string], words: string, userId: string): Promise<Reply> {
  stage.model.script(...steps);
  const [asked, question] = before;
  const messages = [
    { role: 'user', text: asked },
    { role: 'assistant', text: question },
    { role: 'user', text: words },
  ];
  const response = await postAssistantMessages(stage.app, stage.asker.accessToken, messages, {
    clientCapabilities: ['library', 'answer'],
    context: { tapped: { kind: 'friend', userId } },
  });
  expect(response.status).toBe(200);
  return replySchema.parse(response.body);
}

const peopleOf = ({ answer }: Reply): string[] | null => {
  const people = z.object({ input: z.object({ people: z.array(z.object({ userId: z.string() })) }) }).safeParse(answer);
  return people.success ? people.data.input.people.map(({ userId }) => userId) : null;
};

describe('"배고파, 민수랑 같이" with 김민수 (컴퓨터공학부) and 이민수 (경영학과)', () => {
  it('is answered with the question of which one, a cell for each, and nothing planned', async () => {
    const date = '2073-01-03';
    const [kim, lee] = await twoFriends(date, KIM_CS, LEE_BIZ);

    const reply = await replyTo([resolveFor('민수', 'planMeal'), SILENT], '배고파, 민수랑 같이');

    expect(reply.refusal).toEqual({
      kind: 'which-friend',
      lines: [line('민수가 두 명이에요.'), line('누구와 먹을까요?')],
      offers: [cell(kim, '컴퓨터공학부'), cell(lee, '경영학과')],
    });
    expect(reply.answer).toBeNull();
    expect(reply.lookup).toBeNull();
    expect(reply.text).toBe('민수가 두 명이에요.\n누구와 먹을까요?');
    expect(stage.model.toolResults()[0]).toMatchObject({ result: 'several', note: QUESTION_SHOWN });
  });

  it('asks for a meal when planMeal is given one of them, and keeps the model’s words as the text', async () => {
    const date = '2073-01-10';
    const [kim] = await twoFriends(date, KIM_CS, LEE_BIZ);
    const words = '김민수(컴퓨터공학부)와 이민수(경영학과) 중 누구와 먹을까요?';

    const reply = await replyTo([resolve('민수'), planMeal(date, [kim.id]), { text: words }], '배고파, 민수랑 같이');

    expect(reply.refusal).toMatchObject({ lines: [line('민수가 두 명이에요.'), line('누구와 먹을까요?')] });
    expect(reply.answer).toBeNull();
    expect(reply.text).toBe(words);
  });

  it('is pressed: the name with that Friend tapped plans with them, and asks nothing again', async () => {
    const date = '2073-01-17';
    const [, lee] = await twoFriends(date, KIM_CS, LEE_BIZ);

    const reply = await pressed(
      [planMeal(date, [lee.id]), { text: '…' }],
      ['배고파, 민수랑 같이', '민수가 두 명이에요.\n누구와 먹을까요?'],
      '이민수',
      lee.id,
    );

    expect(JSON.stringify(stage.model.received()[0]?.prompt)).toContain(`[Tapped: friend ${lee.id}]`);
    expect(peopleOf(reply)).toEqual([stage.asker.id, lee.id]);
    expect(reply.refusal).toBeNull();
  });
});

describe('Two Friends both named 김민수, of 컴퓨터공학부 and 경영학과', () => {
  it('are asked about by the full name, and a press on one is taken by its id though the name fits both', async () => {
    const date = '2073-01-24';
    const [cs, biz] = await twoFriends(date, KIM_CS, KIM_BIZ);
    const both = [cell(cs, KIM_CS[1]), cell(biz, KIM_BIZ[1])];
    // GET /friends orders one name by id.
    const offers = cs.id.localeCompare(biz.id) < 0 ? both : both.toReversed();

    const asked = await replyTo([resolveFor('김민수', 'planMeal'), SILENT], '김민수랑 밥 먹을래');

    expect(asked.refusal).toEqual({
      kind: 'which-friend',
      lines: [line('김민수가 두 명이에요.'), line('누구와 먹을까요?')],
      offers,
    });

    const reply = await pressed(
      [resolve('김민수'), planMeal(date, [biz.id]), { text: '…' }],
      ['김민수랑 밥 먹을래', asked.text],
      '김민수',
      biz.id,
    );

    expect(stage.model.toolResults()[0]).toMatchObject({ result: 'one', candidate: { id: biz.id } });
    expect(peopleOf(reply)).toEqual([stage.asker.id, biz.id]);
    expect(reply.refusal).toBeNull();
  });
});

describe('Words of another tool', () => {
  it('ask "누구인가요?" for where a Friend is, though findFriend is refused', async () => {
    const date = '2073-01-31';
    const [kim] = await twoFriends(date, KIM_CS, LEE_BIZ);

    const reply = await replyTo(
      [resolve('민수'), { tool: 'findFriend', input: { friendId: kim.id } }, SILENT],
      '민수 어디야?',
    );

    expect(reply.refusal).toMatchObject({
      kind: 'which-friend',
      lines: [line('민수가 두 명이에요.'), line('누구인가요?')],
    });
    expect(reply.lookup).toBeNull();
  });

  it('ask "누구와 만날까요?" when planMeet is given one of them', async () => {
    const date = '2073-02-07';
    const [kim] = await twoFriends(date, KIM_CS, LEE_BIZ);
    const planMeet: Step = { tool: 'planMeet', input: { date, friendIds: [kim.id] } };

    const reply = await replyTo([resolve('민수'), planMeet, SILENT], '민수 만나고 싶어', {
      clientCapabilities: ['library', 'answer', 'meet'],
    });

    expect(reply.refusal).toMatchObject({ lines: [line('민수가 두 명이에요.'), line('누구와 만날까요?')] });
    expect(reply.answer).toBeNull();
  });
});

describe('An app that does not draw answers', () => {
  it('gets no question, and the model asks in its own words', async () => {
    const date = '2073-02-14';
    await twoFriends(date, KIM_CS, LEE_BIZ);
    const words = '민수가 두 명이에요.\n김민수(컴퓨터공학부)와 이민수(경영학과) 중 누구와 먹을까요?';

    const reply = await replyTo([resolveFor('민수', 'planMeal'), { text: words }], '배고파, 민수랑 같이', {
      clientCapabilities: ['library'],
    });

    expect(reply.refusal).toBeNull();
    expect(reply.text).toBe(words);
    expect(stage.model.toolResults()[0]).not.toHaveProperty('note');
  });
});
