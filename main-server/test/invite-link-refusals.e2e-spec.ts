// AI-generated with Claude Opus 5.5, 2026-10-05, prompted by fyoon46, reviewed by TaeHyun79 in #40
import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { connect } from './containers.js';
import { befriend, getFriends, signInUser } from './friends.js';
import {
  acceptInviteLink,
  createInviteLink,
  getInviteLink,
  inviteLinkTokenHash,
  setInviteLinkExpiry,
} from './invite-links.js';
import { overlapOnLock } from './overlap.js';
import { refused } from './signals.js';
import { startApp } from './start-app.js';

const settings = inject('settings');
let app: INestApplication<Server>;
const prisma = connect(settings.DATABASE_URL);

beforeAll(async () => {
  app = await startApp(settings);
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

describe('A used Invite Link', () => {
  it('is refused to the next User and leaves no second friendship', async () => {
    const sender = await signInUser(app);
    const token = await createInviteLink(app, sender);
    const [first, second] = await Promise.all([signInUser(app), signInUser(app)]);
    await acceptInviteLink(app, first, token);

    const response = await acceptInviteLink(app, second, token);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'INVITE_LINK_USED'));
    expect((await getInviteLink(app, second, token)).body).toMatchObject({ status: 'used' });
    expect((await getFriends(app, sender)).body).toMatchObject([{ id: first.id }]);
  });
});

describe('An Invite Link past its 24 hours', () => {
  it('is answered as expired and refused', async () => {
    const sender = await signInUser(app);
    const token = await createInviteLink(app, sender);
    await setInviteLinkExpiry(prisma, token, new Date(Date.now() - 1000));
    const receiver = await signInUser(app);

    const response = await acceptInviteLink(app, receiver, token);

    expect(response.status).toBe(410);
    expect(response.body).toMatchObject(refused(410, 'INVITE_LINK_EXPIRED'));
    expect((await getInviteLink(app, receiver, token)).body).toMatchObject({ status: 'expired' });
    expect((await getFriends(app, receiver)).body).toEqual([]);
  });
});

describe("The sender's own Invite Link", () => {
  it('is refused to the sender', async () => {
    const sender = await signInUser(app);
    const token = await createInviteLink(app, sender);

    const response = await acceptInviteLink(app, sender, token);

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject(refused(400, 'OWN_INVITE_LINK'));
  });
});

describe("A Friend's Invite Link", () => {
  it('is answered as from a Friend, refused, and stays usable for others', async () => {
    const [sender, friend, other] = await Promise.all([signInUser(app), signInUser(app), signInUser(app)]);
    await befriend(app, sender, friend);
    const token = await createInviteLink(app, sender);

    expect((await getInviteLink(app, friend, token)).body).toMatchObject({ status: 'friend' });
    const response = await acceptInviteLink(app, friend, token);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'ALREADY_FRIENDS'));
    expect((await acceptInviteLink(app, other, token)).status).toBe(204);
  });
});

describe('A token nobody made', () => {
  it.each([
    ['looked up', getInviteLink],
    ['accepted', acceptInviteLink],
  ])('is refused when %s', async (_case, call) => {
    const user = await signInUser(app);

    const response = await call(app, user, 'no-such-token');

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject(refused(404, 'INVITE_LINK_NOT_FOUND'));
  });
});

describe('Two Users accepting one Invite Link at the same moment', () => {
  it('leave one friendship: one is accepted and the other told that the link is used', async () => {
    const sender = await signInUser(app);
    const token = await createInviteLink(app, sender);
    const [first, second] = await Promise.all([signInUser(app), signInUser(app)]);
    const tokenHash = inviteLinkTokenHash(token);

    const answers = await overlapOnLock(
      prisma,
      (tx) => tx.$queryRaw`SELECT 1 FROM invite_links WHERE token_hash = ${tokenHash} FOR UPDATE`,
      () => acceptInviteLink(app, first, token),
      () => acceptInviteLink(app, second, token),
    );

    expect(answers.map(({ status }) => status)).toEqual([204, 409]);
    expect(answers[1].body).toMatchObject(refused(409, 'INVITE_LINK_USED'));
    expect((await getFriends(app, sender)).body).toMatchObject([{ id: first.id }]);
    expect((await getFriends(app, second)).body).toEqual([]);
  });
});
