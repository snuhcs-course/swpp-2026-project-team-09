// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import { z } from 'zod';
import { inviteLink, meetup, quest } from './answers.js';
import { ENGINEERING_BUILDING, hoursFromNow, JAHAYEON, NEW_MEDIA_INSTITUTE, SEOUL_STATION } from './campus.js';
import { signIn, type Student } from './people.js';

// Minji sends an Invite Link; Jun opens it and accepts, and both are told.
async function theyBecomeFriendsThroughAnInviteLink(minji: Student, jun: Student): Promise<void> {
  const { url } = await minji.post('/invite-links', undefined, inviteLink);
  const token = url.split('/invite/').at(1) ?? '';
  const invitation = z.object({ sender: z.object({ name: z.string() }), status: z.string() });
  expect(await jun.get(`/invite-links/${token}`, invitation)).toEqual({ sender: { name: '김민지' }, status: 'usable' });
  await jun.post(`/invite-links/${token}/accept`);
  await minji.inbox.receivesSignal('friends-changed');
  await jun.inbox.receivesSignal('friends-changed');
}

// Both turn the Master Switch on, and each receives the other's position.
async function theySeeEachOther(minji: Student, jun: Student): Promise<void> {
  await minji.put('/users/me/master-switch', { on: true });
  await jun.put('/users/me/master-switch', { on: true });
  await minji.uploadsPosition(JAHAYEON);
  await jun.receivesPositionOf(minji, JAHAYEON);
  await jun.uploadsPosition(ENGINEERING_BUILDING);
  await minji.receivesPositionOf(jun, ENGINEERING_BUILDING);
}

// Minji leaves the campus: her position is not shared, and her Avatar leaves Jun's map. Back on campus, it returns.
async function offCampusSheIsHidden(minji: Student, jun: Student): Promise<void> {
  expect(await minji.uploadsPosition(SEOUL_STATION)).toBe(true);
  await jun.receivesRemovalOf(minji);
  await jun.receivesNoPositionOf(minji);
  await minji.uploadsPosition(NEW_MEDIA_INSTITUTE);
  await jun.receivesPositionOf(minji, NEW_MEDIA_INSTITUTE);
}

// Jun turns off sharing with Minji: neither sees the other until he turns it on again.
async function theFriendshipsSwitchHidesThem(minji: Student, jun: Student): Promise<void> {
  await jun.put(`/friends/${minji.id}/sharing`, { on: false });
  await minji.receivesRemovalOf(jun);
  await jun.receivesRemovalOf(minji);
  await minji.uploadsPosition(JAHAYEON);
  await jun.receivesNoPositionOf(minji);
  await jun.put(`/friends/${minji.id}/sharing`, { on: true });
  await minji.uploadsPosition(NEW_MEDIA_INSTITUTE);
  await jun.receivesPositionOf(minji, NEW_MEDIA_INSTITUTE);
}

// Minji proposes lunch at 자하연; Jun accepts, and both hold the same Shared Quest.
async function theyAgreeOnAMeetup(minji: Student, jun: Student): Promise<void> {
  const place = { ...JAHAYEON, label: '자하연 앞' };
  const proposed = await minji.create(
    '/meetups',
    { receiverId: jun.id, title: '점심', startsAt: hoursFromNow(1), place },
    meetup,
  );
  await jun.inbox.receivesSignal('meetups-changed');
  await jun.post(`/meetups/${proposed.id}/accept`);
  await minji.inbox.receivesSignal('quests-changed');
  const [shared] = await minji.get('/quests', z.array(quest));
  expect(shared).toMatchObject({ title: '점심', holders: [{ id: minji.id }, { id: jun.id }] });
  expect(await jun.get('/quests', z.array(quest))).toMatchObject([{ id: shared?.id }]);
}

// Jun ends the friendship: each loses the other at once, and positions stop.
async function partingStopsThePositions(minji: Student, jun: Student): Promise<void> {
  await jun.delete(`/friends/${minji.id}`);
  await minji.receivesRemovalOf(jun);
  await jun.receivesRemovalOf(minji);
  await minji.uploadsPosition(JAHAYEON);
  await jun.receivesNoPositionOf(minji);
  expect(await jun.get('/positions', z.array(z.unknown()))).toEqual([]);
}

it('two Friends from an Invite Link see each other, agree on a Meetup, and stop seeing each other when they part', async () => {
  const minji = await signIn('김민지');
  const jun = await signIn('이준');
  await theyBecomeFriendsThroughAnInviteLink(minji, jun);
  await theySeeEachOther(minji, jun);
  await offCampusSheIsHidden(minji, jun);
  await theFriendshipsSwitchHidesThem(minji, jun);
  await theyAgreeOnAMeetup(minji, jun);
  await partingStopsThePositions(minji, jun);
});
