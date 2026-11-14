/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { inviteLink } from './answers.js';
import { seoulDay } from './campus.js';
import { signIn, type Student } from './people.js';
import { workerCollects } from './stack.js';

// Steps 4 to 7 of the agentic map's first path, across the servers: a Plan becomes a Quest with its invitation, the
// invited Friend finds it, reads their own way, and accepts, and the Leader's app is told who accepted.

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const place = z.object({ id: z.string(), number: z.string().nullable() });

const plan = z.object({
  id: z.string(),
  title: z.string(),
  startAt: z.string(),
  endAt: z.string(),
  subQuests: z.array(z.object({ title: z.string() })),
});

type Plan = z.infer<typeof plan>;

const quest = z.object({
  id: z.string(),
  title: z.string(),
  leader: z.object({ id: z.string() }),
  subQuests: z.array(z.object({ title: z.string(), endsAt: z.string() })),
  members: z.array(z.object({ user: z.object({ id: z.string() }), state: z.string() })),
});

const planQuest = z.object({ quest, invitations: z.array(z.object({ id: z.string(), userId: z.string() })) });

type PlanQuest = z.infer<typeof planQuest>;

const card = z.object({
  gathering: z.object({ startAt: z.string() }),
  way: z.object({
    status: z.string(),
    origin: z.object({ basis: z.string() }).nullable(),
    leaveAt: z.string().nullable(),
    scene: z.object({ people: z.array(z.object({ userId: z.string() })) }),
  }),
});

const instant = (time: string): number => new Date(time).getTime();

const states = ({ members }: z.infer<typeof quest>): string[][] => members.map(({ user, state }) => [user.id, state]);

async function theyBecomeFriends(yusang: Student, minsu: Student): Promise<void> {
  const { url } = await yusang.post('/invite-links', undefined, inviteLink);
  await minsu.post(`/invite-links/${url.split('/invite/').at(1) ?? ''}/accept`);
  await yusang.inbox.receivesSignal('friends-changed');
  await minsu.inbox.receivesSignal('friends-changed');
}

// A Class on that weekday in the building of that number.
async function hasClass(student: Student, weekday: string, [start, end]: string[], number: string): Promise<void> {
  const places = await student.get('/places', z.array(place));
  const placeId = places.find((each) => each.number === number)?.id;
  const times = [{ weekday, startTime: start, endTime: end, placeId }];
  await student.create('/timetable/classes', { courseName: '수업', times }, z.unknown());
}

// Tomorrow's lunch, so that the flow runs the same at any hour: each has a Class until shortly before it. The answer
// is the recalculation's, which asks no model.
async function tomorrowsLunch(yusang: Student, minsu: Student): Promise<{ input: object; first: Plan }> {
  const date = seoulDay(new Date(Date.now() + DAY_MS));
  const weekday = WEEKDAYS[new Date(date).getUTCDay()] ?? 'monday';
  await hasClass(yusang, weekday, ['11:00', '11:50'], '301');
  await hasClass(minsu, weekday, ['11:00', '12:15'], '302');
  const input = {
    kind: 'meal',
    date,
    meal: 'lunch',
    people: [yusang.id, minsu.id].map((userId) => ({ userId, constraints: [] })),
    window: { from: null, until: null },
    placeId: null,
  };
  const { plans } = await yusang.post(
    '/assistant/answers',
    { input, location: null },
    z.object({ plans: z.array(plan) }),
  );
  const [first] = plans;
  if (first === undefined) {
    throw new Error('The servers planned no lunch for tomorrow from the collected menus');
  }
  return { input, first };
}

// Step 4: "이대로 초대" makes the Quest with the Plan's steps and the invitation at once.
async function thePlanBecomesAQuest(yusang: Student, minsu: Student, input: object, first: Plan): Promise<PlanQuest> {
  const making = { input, planId: first.id, startAt: first.startAt, location: null };
  const made = await yusang.create('/plans', making, planQuest);
  expect(made.quest.title).toBe(first.title);
  expect(made.quest.leader.id).toBe(yusang.id);
  expect(made.quest.subQuests.map(({ title }) => title)).toEqual(first.subQuests.map(({ title }) => title));
  expect(instant(made.quest.subQuests.at(-1)?.endsAt ?? '')).toBe(instant(first.endAt));
  expect(made.invitations.map(({ userId }) => userId)).toEqual([minsu.id]);
  expect(states(made.quest)).toEqual([
    [yusang.id, 'accepted'],
    [minsu.id, 'invited'],
  ]);
  return made;
}

// Step 5: the invitation is in Minsu's list, which the app's notifications are made from.
async function theInvitationIsListed(minsu: Student, made: PlanQuest): Promise<void> {
  await minsu.inbox.receivesSignal('quests-changed');
  const waiting = z.array(z.object({ id: z.string(), quest: z.object({ id: z.string() }) }));
  const listed = await minsu.get('/quest-invitations', waiting);
  expect(listed.map((each) => [each.id, each.quest.id])).toEqual([[made.invitations[0]?.id, made.quest.id]]);
}

// Step 6: opened, it shows Minsu his own way, from the building of his Class, and nobody else. The Leader cannot read it.
async function theCardShowsHisOwnWay(
  yusang: Student,
  minsu: Student,
  invitationId: string,
  first: Plan,
): Promise<void> {
  const opened = await minsu.get(`/quest-invitations/${invitationId}`, card);
  expect(instant(opened.gathering.startAt)).toBe(instant(first.startAt));
  expect(opened.way.status).toBe('ok');
  expect(opened.way.origin?.basis).toBe('timetable');
  expect(opened.way.leaveAt).not.toBeNull();
  expect(opened.way.scene.people.map(({ userId }) => userId)).toEqual([minsu.id]);
  expect((await yusang.call('GET', `/quest-invitations/${invitationId}`)).status).toBe(404);
}

// Step 7: Minsu accepts, and Yusang's app is told who, so that his chip turns to ✓.
async function acceptingTellsTheLeader(yusang: Student, minsu: Student, made: PlanQuest): Promise<void> {
  await minsu.post(`/quest-invitations/${made.invitations[0]?.id ?? ''}/accept`);
  await yusang.inbox.receives(
    'invitation-accepted',
    z.object({ questId: z.string(), userId: z.string() }),
    ({ questId, userId }) => questId === made.quest.id && userId === minsu.id,
  );
  expect(states(await yusang.get(`/quests/${made.quest.id}`, quest))).toEqual([
    [yusang.id, 'accepted'],
    [minsu.id, 'accepted'],
  ]);
}

it('a Plan becomes a Quest, and the invited Friend reads their own way and accepts', async () => {
  const yusang = await signIn('윤유상');
  const minsu = await signIn('김민수');
  await theyBecomeFriends(yusang, minsu);
  await workerCollects('coop_menus');
  const { input, first } = await tomorrowsLunch(yusang, minsu);
  const made = await thePlanBecomesAQuest(yusang, minsu, input, first);
  await theInvitationIsListed(minsu, made);
  await theCardShowsHisOwnWay(yusang, minsu, made.invitations[0]?.id ?? '', first);
  await acceptingTellsTheLeader(yusang, minsu, made);
});
