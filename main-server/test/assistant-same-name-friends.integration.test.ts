/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type AnswerReply, type Lookup } from '../src/assistant/dto/answer.dto.js';
import { QUESTION_SHOWN } from '../src/assistant/refusals/friend-question.js';
import { MealPlanStage, type Named, planMeal, resolve } from './meal-plan.js';
import { type Step } from './scripted-model.js';

// Words that fit two Friends, at the Assistant's endpoint with the scripted model: resolveFriend answers each with full
// name and department, and no tool takes either until a later answer names one alone, by full name only. Each test asks
// on a Tuesday of 2079, which no other file uses, as a new User.

const stage = new MealPlanStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const RESTAURANTS = ['301동식당', '302동식당', '학생회관식당', '3식당', '자하연식당 2층'];

const replySchema = z.object({
  text: z.string(),
  answer: z.custom<AnswerReply | null>(),
  lookup: z.custom<Lookup | null>(),
});

const ASKS = 'fit several Friends';

// Everyone of the meal the reply planned, the asker first, or null when it planned none.
function plannedWith(body: unknown): string[] | null {
  const { answer } = replySchema.parse(body);
  return answer?.input.kind === 'meal' ? answer.input.people.map(({ userId }) => userId) : null;
}

const nameText = (name: string): string => `<data label="friend.name">${name}</data>`;
const departmentText = (department: string): string => `<data label="friend.department">${department}</data>`;

const candidate = ({ id, name }: Named, department: string): object => ({
  id,
  name: nameText(name),
  department: departmentText(department),
});

// The Friend of a 'one', whose department never reaches the model.
const single = ({ id, name }: Named): object => ({ id, name: nameText(name) });

const resolveIn = (name: string, department: string): Step => ({
  tool: 'resolveFriend',
  input: { name, department },
});

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

describe('"배고파, 민수랑 같이" with 김민수 (컴퓨터공학부) and 이민수 (경영학과)', () => {
  it('answers both by full name and department, and planMeal takes neither, so nothing is planned', async () => {
    const date = '2079-01-03';
    const [kim, lee] = await twoFriends(date, KIM_CS, LEE_BIZ);

    const response = await stage.send(
      [resolve('민수'), planMeal(date, [kim.id]), { text: '민수가 두 명이에요.\n김민수와 이민수 중 누구와 먹을까요?' }],
      {},
      '배고파, 민수랑 같이',
    );

    const [several, refused] = stage.model.toolResults();
    expect(several).toEqual({
      result: 'several',
      candidates: [candidate(kim, '컴퓨터공학부'), candidate(lee, '경영학과')],
      more: false,
      note: QUESTION_SHOWN,
    });
    expect(JSON.stringify(refused)).toContain(ASKS);
    expect(replySchema.parse(response.body).answer).toBeNull();
  });

  it('plans with the one the User tapped among them', async () => {
    const date = '2079-01-10';
    const [kim] = await twoFriends(date, KIM_CS, LEE_BIZ);

    const response = await stage.send([resolve('민수'), planMeal(date, [kim.id]), { text: '…' }], {
      context: { tapped: { kind: 'friend', userId: kim.id } },
    });

    expect(plannedWith(response.body)).toEqual([stage.asker.id, kim.id]);
  });
});

describe('findFreeFriends after resolveFriend answered both 민수', () => {
  it('finds both free, and planMeal still takes neither until resolveFriend names one alone', async () => {
    const date = '2079-01-17';
    const [kim, lee] = await twoFriends(date, KIM_CS, LEE_BIZ);

    const response = await stage.send([
      resolve('민수'),
      { tool: 'findFreeFriends', input: { date, meal: 'lunch', friendIds: [lee.id] } },
      { tool: 'findFreeFriends', input: { date, meal: 'lunch' } },
      planMeal(date, [lee.id]),
      resolveIn('민수', '경영'),
      planMeal(date, [lee.id]),
      { text: '…' },
    ]);

    const [, withIds, free, refused, one] = stage.model.toolResults();
    expect(JSON.stringify(withIds)).toContain(ASKS);
    expect(free).toMatchObject({ result: 'found', friends: [{ id: kim.id }, { id: lee.id }] });
    expect(JSON.stringify(refused)).toContain(ASKS);
    expect(one).toEqual({ result: 'one', candidate: single(lee) });
    expect(plannedWith(response.body)).toEqual([stage.asker.id, lee.id]);
  });
});

describe('Two Friends both named 김민수, of 컴퓨터공학부 and 경영학과', () => {
  it('are asked about, and the User’s answer "경영" plans with the one of 경영학과', async () => {
    const date = '2079-01-24';
    const [cs, biz] = await twoFriends(date, KIM_CS, KIM_BIZ);
    const both = [candidate(cs, '컴퓨터공학부'), candidate(biz, '경영학과')];
    // GET /friends orders one name by id.
    const candidates = cs.id.localeCompare(biz.id) < 0 ? both : both.toReversed();

    await stage.send([resolve('김민수'), { text: '…' }], {}, '김민수랑 밥 먹을래');
    expect(stage.model.toolResults()).toEqual([{ result: 'several', candidates, more: false, note: QUESTION_SHOWN }]);

    const response = await stage.send(
      [resolveIn('김민수', '경영'), planMeal(date, [biz.id]), { text: '…' }],
      {},
      '경영',
    );

    expect(stage.model.toolResults()[0]).toEqual({ result: 'one', candidate: single(biz) });
    expect(plannedWith(response.body)).toEqual([stage.asker.id, biz.id]);
  });
});

describe('"민수 어디야?" with 김민수 (컴퓨터공학부) and 이민수 (경영학과)', () => {
  it('is asked about the same way, and findFriend draws nobody until the User names one', async () => {
    const date = '2079-01-31';
    const [kim] = await twoFriends(date, KIM_CS, LEE_BIZ);
    const findFriend: Step = { tool: 'findFriend', input: { friendId: kim.id } };

    const asked = await stage.send([resolve('민수'), findFriend, { text: '…' }], {}, '민수 어디야?');

    expect(JSON.stringify(stage.model.toolResults()[1])).toContain(ASKS);
    expect(replySchema.parse(asked.body).lookup).toBeNull();

    const answered = await stage.send([resolveIn('민수', '컴퓨터'), findFriend, { text: '…' }], {}, '컴퓨터공학부');

    expect(stage.model.toolResults()[1]).toMatchObject({ result: 'found', name: nameText('김민수') });
    expect(replySchema.parse(answered.body).lookup).not.toBeNull();
  });
});

describe('An app that does not draw answers', () => {
  it('gets the same candidates, and proposeQuest invites neither', async () => {
    const date = '2079-02-07';
    const [kim, lee] = await twoFriends(date, KIM_CS, LEE_BIZ);
    const proposal = {
      title: '저녁',
      joinPolicy: 'closed',
      capacity: 2,
      startsAt: `${date}T18:00:00+09:00`,
      inviteeIds: [kim.id],
    };

    await stage.send([resolve('민수'), { tool: 'proposeQuest', input: proposal }, { text: '…' }], {
      clientCapabilities: ['library'],
    });

    const [several, refused] = stage.model.toolResults();
    expect(several).toMatchObject({ candidates: [candidate(kim, '컴퓨터공학부'), candidate(lee, '경영학과')] });
    expect(refused).toMatchObject({
      result: 'refused',
      fields: { inviteeIds: expect.stringContaining(ASKS) as unknown },
    });
  });
});
