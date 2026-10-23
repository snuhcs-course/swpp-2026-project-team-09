/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { z } from 'zod';
import { party, quest } from './answers.js';
import { hoursFromNow } from './campus.js';
import { signIn, type Student } from './people.js';

const BOARD = 'hobby';

const recruiting = z.array(z.object({ id: z.string() }));

const joinRequests = z.array(z.object({ id: z.string(), user: z.object({ id: z.string() }) }));

async function eachIsTold(signal: string, students: Student[]): Promise<void> {
  await Promise.all(students.map((student) => student.inbox.receivesSignal(signal)));
}

// Minji makes an Approval Quest on a Board, with a Sub Quest tomorrow, and Seoyeon, who only reads the Board, finds it.
async function minjiPostsAnApprovalQuest(minji: Student, seoyeon: Student): Promise<string> {
  const { id } = await minji.create(
    '/quests/own',
    {
      title: '보드게임 같이 해요',
      subQuest: { title: '보드게임 카페', startsAt: hoursFromNow(24), endsAt: hoursFromNow(26) },
      joinPolicy: 'approval',
      board: BOARD,
    },
    quest,
  );
  await minji.inbox.receivesSignal('quests-changed');
  expect(await seoyeon.get(`/quests/recruiting?board=${BOARD}`, recruiting)).toEqual([{ id }]);
  return id;
}

// A User asks to join, and Minji, the Leader, is told. She accepts the request from the Quest's list. Every Holder, the
// new one included, is told and reads the Holders in the order they entered.
async function minjiAccepts(questId: string, minji: Student, asking: Student, holders: Student[]): Promise<void> {
  await asking.post('/quest-join-requests', { questId });
  await minji.inbox.receivesSignal('quests-changed');
  const requests = await minji.get(`/quests/${questId}/join-requests`, joinRequests);
  expect(requests.map(({ user }) => user.id)).toEqual([asking.id]);
  const [request] = requests;
  await minji.post(`/quests/${questId}/join-requests/${request.id}/accept`);
  await Promise.all(
    holders.map(async (holder) => {
      await holder.inbox.receivesSignal('quests-changed');
      const read = await holder.get(`/quests/${questId}`, quest);
      expect(read.holders.map(({ id }) => id)).toEqual(holders.map(({ id }) => id));
    }),
  );
}

// Minji opens the Quest's Party, and Jun and Hana enter it. Every Holder is told of each change.
async function theyEnterTheQuestsParty(questId: string, minji: Student, jun: Student, hana: Student): Promise<void> {
  const holders = [minji, jun, hana];
  const opened = await minji.post('/parties', { title: '보드게임 카페 가요', questId }, party);
  await eachIsTold('party-changed', holders);
  await jun.post(`/parties/${opened.id}/join`, undefined, party);
  await eachIsTold('party-changed', holders);
  const entered = await hana.post(`/parties/${opened.id}/join`, undefined, party);
  await eachIsTold('party-changed', holders);
  expect(entered.members.map(({ id }) => id)).toEqual([minji.id, jun.id, hana.id]);
}

// Minji ends the group as the app does with its Party on: the Party first, then the Quest. Jun and Hana are told, and
// the Quest, its post on the Board and the Party are gone.
async function minjiEndsTheGroup(
  questId: string,
  minji: Student,
  jun: Student,
  hana: Student,
  seoyeon: Student,
): Promise<void> {
  await minji.post('/parties/mine/end');
  await minji.post(`/quests/${questId}/end`);
  await Promise.all(
    [jun, hana].map(async (member) => {
      await member.inbox.receivesSignal('party-changed');
      await member.inbox.receivesSignal('quests-changed');
      expect(await member.call('GET', '/parties/mine')).toMatchObject({ status: 404, body: { code: 'NOT_IN_PARTY' } });
    }),
  );
  expect(await jun.call('GET', `/quests/${questId}`)).toMatchObject({ status: 404, body: { code: 'QUEST_NOT_FOUND' } });
  expect(await seoyeon.get(`/quests/recruiting?board=${BOARD}`, recruiting)).toEqual([]);
}

it('a Leader accepts two Users into an Approval Quest and ends it with its Party, and the others are told each time', async () => {
  const minji = await signIn('김민지');
  const jun = await signIn('이준');
  const hana = await signIn('박하나');
  const seoyeon = await signIn('최서연');
  const questId = await minjiPostsAnApprovalQuest(minji, seoyeon);
  await minjiAccepts(questId, minji, jun, [minji, jun]);
  await minjiAccepts(questId, minji, hana, [minji, jun, hana]);
  await theyEnterTheQuestsParty(questId, minji, jun, hana);
  await minjiEndsTheGroup(questId, minji, jun, hana, seoyeon);
});
