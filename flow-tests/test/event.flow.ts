/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { globalEvent, matchingRequest, party, quest, walkingRoute } from './answers.js';
import { ENGINEERING_BUILDING, hoursFromNow, JAHAYEON, NEW_MEDIA_INSTITUTE } from './campus.js';
import { APP_CLIENT_ID, signIn, signInAsAdministrator, signInWithGoogle, type Student } from './people.js';

type GlobalEvent = z.infer<typeof globalEvent>;

// A round of the match server runs every second (compose.test.yaml).
const MATCHING_WAIT_MS = 15_000;

async function anOutsiderIsRefused(): Promise<void> {
  const outsider = await signInWithGoogle({
    aud: APP_CLIENT_ID,
    sub: '300000000000000000001',
    email: 'someone@gmail.com',
  });
  expect(outsider.status).toBe(403);
}

async function anAdministratorPublishesAnEventForTomorrow(): Promise<GlobalEvent> {
  const administrator = await signInAsAdministrator();
  const draft = await administrator.create(
    '/admin/global-events',
    {
      title: '지능형통신 연합전공 설명회',
      description: '연합전공 설명회입니다.',
      startsAt: hoursFromNow(24),
      endsAt: hoursFromNow(26),
      place: '뉴미디어통신공동연구소 이충웅홀(132동 103호)',
      ...NEW_MEDIA_INSTITUTE,
    },
    globalEvent,
  );
  const event = await administrator.post(
    `/admin/global-events/${draft.id}/publish`,
    { version: draft.version },
    globalEvent,
  );
  expect(event.state).toBe('published');
  return event;
}

// Both ask for Matching in a group of two; after the match server's round both hold the same Shared Quest.
async function bothAreMatched(event: GlobalEvent, minji: Student, jun: Student): Promise<string> {
  await minji.post('/matching-requests', { globalEventId: event.id, size: 2 });
  await jun.post('/matching-requests', { globalEventId: event.id, size: 2 });
  await minji.inbox.receivesSignal('matching-changed', MATCHING_WAIT_MS);
  await jun.inbox.receivesSignal('matching-changed', MATCHING_WAIT_MS);
  const { state, questId } = await minji.get(`/matching-requests/${event.id}`, matchingRequest);
  expect(state).toBe('matched');
  expect(await jun.get(`/matching-requests/${event.id}`, matchingRequest)).toEqual({ state: 'matched', questId });
  const shared = await jun.get(`/quests/${String(questId)}`, quest);
  expect(shared.globalEvent?.id).toBe(event.id);
  expect(shared.holders.map((holder) => holder.id)).toEqual([minji.id, jun.id]);
  return shared.id;
}

// Minji opens the Quest's Party. A second Party for the Quest is refused, and Jun, a Holder, enters Minji's at once.
async function theyMeetInTheQuestsParty(questId: string, minji: Student, jun: Student): Promise<void> {
  const opened = await minji.post('/parties', { title: '설명회 같이 가요', questId }, party);
  expect(await jun.call('POST', '/parties', { title: '저도 열래요', questId })).toMatchObject({
    status: 409,
    body: { code: 'PARTY_EXISTS_FOR_QUEST', partyId: opened.id },
  });
  const entered = await jun.post(`/parties/${opened.id}/join`, undefined, party);
  expect(entered.members.map((member) => member.id)).toEqual([minji.id, jun.id]);
  await minji.inbox.receivesSignal('party-changed');
}

// Both turn the Master Switch on and walk on campus; each sees the other through the Party, and Minji finds her way.
async function theySeeEachOtherOnTheWay(event: GlobalEvent, minji: Student, jun: Student): Promise<void> {
  await minji.put('/users/me/master-switch', { on: true });
  await jun.put('/users/me/master-switch', { on: true });
  expect(await minji.uploadsPosition(JAHAYEON)).toBe(false);
  await jun.receivesPositionOf(minji, JAHAYEON);
  expect(await jun.uploadsPosition(ENGINEERING_BUILDING)).toBe(false);
  await minji.receivesPositionOf(jun, ENGINEERING_BUILDING);
  const query = new URLSearchParams({
    startLatitude: String(JAHAYEON.latitude),
    startLongitude: String(JAHAYEON.longitude),
    endLatitude: String(event.latitude),
    endLongitude: String(event.longitude),
  });
  const route = await minji.get(`/walking-route?${query}`, walkingRoute);
  expect(route.status).toBe('OK');
  expect(route.route?.line.length).toBeGreaterThan(1);
}

// Jun turns the Master Switch off: Minji loses him at once, and neither sees the other any more.
async function aSwitchTurnedOffHidesThemAtOnce(minji: Student, jun: Student): Promise<void> {
  await jun.put('/users/me/master-switch', { on: false });
  await minji.receivesRemovalOf(jun);
  await minji.uploadsPosition(NEW_MEDIA_INSTITUTE);
  await jun.receivesNoPositionOf(minji);
  expect(await minji.get('/positions', z.array(z.unknown()))).toEqual([]);
}

it('two students matched for an event meet in its Party and see each other on the way there', async () => {
  await anOutsiderIsRefused();
  const event = await anAdministratorPublishesAnEventForTomorrow();
  const minji = await signIn('김민지');
  const jun = await signIn('이준');
  expect(await minji.get('/global-events', z.array(z.object({ id: z.string() })))).toEqual([{ id: event.id }]);
  const questId = await bothAreMatched(event, minji, jun);
  await theyMeetInTheQuestsParty(questId, minji, jun);
  await theySeeEachOtherOnTheWay(event, minji, jun);
  await aSwitchTurnedOffHidesThemAtOnce(minji, jun);
});
