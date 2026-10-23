/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { z } from 'zod';
import { inviteLink } from './answers.js';
import { ENGINEERING_BUILDING, JAHAYEON, NEW_MEDIA_INSTITUTE } from './campus.js';
import { signIn, type Student } from './people.js';

// Jun accepts Minji's Invite Link, both turn the Master Switch on, and Minji's position on campus reaches Jun.
async function theyAreFriendsWhoSeeEachOther(minji: Student, jun: Student): Promise<void> {
  const { url } = await minji.post('/invite-links', undefined, inviteLink);
  await jun.post(`/invite-links/${url.split('/invite/').at(1) ?? ''}/accept`);
  await minji.inbox.receivesSignal('friends-changed');
  await jun.inbox.receivesSignal('friends-changed');
  await minji.put('/users/me/master-switch', { on: true });
  await jun.put('/users/me/master-switch', { on: true });
  await minji.uploadsPosition(JAHAYEON);
  await jun.receivesPositionOf(minji, JAHAYEON);
}

// The first phone is told why its Session ended, and then the socket server closes its connection.
async function theFirstPhoneIsSignedOut(firstPhone: Student): Promise<void> {
  const ended = await firstPhone.inbox.receives('session-ended', z.unknown(), () => true);
  expect(ended).toEqual({ code: 'SESSION_REPLACED' });
  await firstPhone.inbox.isDisconnectedByServer();
}

// The first phone's next upload is refused, and no position of Minji reaches Jun.
async function theFirstPhoneSendsNoMorePositions(firstPhone: Student, jun: Student): Promise<void> {
  const upload = { ...NEW_MEDIA_INSTITUTE, accuracy: 10, measuredAt: new Date().toISOString() };
  expect(await firstPhone.call('POST', '/positions', upload)).toMatchObject({
    status: 401,
    body: { code: 'SESSION_REPLACED' },
  });
  await jun.receivesNoPositionOf(firstPhone);
}

it("a sign-in on a second phone ends the first phone's Session, and only the second phone's positions reach a Friend", async () => {
  const minji = await signIn('김민지');
  const jun = await signIn('이준');
  await theyAreFriendsWhoSeeEachOther(minji, jun);
  const secondPhone = await minji.signsInOnAnotherPhone();
  expect(secondPhone.id).toBe(minji.id);
  await theFirstPhoneIsSignedOut(minji);
  await theFirstPhoneSendsNoMorePositions(minji, jun);
  await secondPhone.uploadsPosition(ENGINEERING_BUILDING);
  await jun.receivesPositionOf(secondPhone, ENGINEERING_BUILDING);
});
