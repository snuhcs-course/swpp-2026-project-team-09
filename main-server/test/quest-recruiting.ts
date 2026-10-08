import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { z } from 'zod';
import { TestUser } from './friends.js';
import { withAccessToken } from './sign-in.js';

// Requests to join a Quest, invitations into one and the Leader's controls (README.md: Quests).

export function askToJoin(app: INestApplication<Server>, user: TestUser, questId: string): request.Test {
  return withAccessToken(request(app.getHttpServer()).post('/quest-join-requests'), user.accessToken).send({ questId });
}

export function getSentJoinRequests(app: INestApplication<Server>, user: TestUser): request.Test {
  return withAccessToken(request(app.getHttpServer()).get('/quest-join-requests'), user.accessToken);
}

export function withdrawJoinRequest(app: INestApplication<Server>, user: TestUser, requestId: string): request.Test {
  return withAccessToken(
    request(app.getHttpServer()).post(`/quest-join-requests/${requestId}/withdraw`),
    user.accessToken,
  );
}

export function getJoinRequests(app: INestApplication<Server>, leader: TestUser, questId: string): request.Test {
  return withAccessToken(request(app.getHttpServer()).get(`/quests/${questId}/join-requests`), leader.accessToken);
}

export function answerJoinRequest(
  app: INestApplication<Server>,
  leader: TestUser,
  path: { questId: string; requestId: string },
  answer: 'accept' | 'decline',
): request.Test {
  return withAccessToken(
    request(app.getHttpServer()).post(`/quests/${path.questId}/join-requests/${path.requestId}/${answer}`),
    leader.accessToken,
  );
}

export function invite(app: INestApplication<Server>, leader: TestUser, questId: string, userId: string): request.Test {
  return withAccessToken(request(app.getHttpServer()).post(`/quests/${questId}/invitations`), leader.accessToken).send({
    userId,
  });
}

export function getSentInvitations(app: INestApplication<Server>, leader: TestUser, questId: string): request.Test {
  return withAccessToken(request(app.getHttpServer()).get(`/quests/${questId}/invitations`), leader.accessToken);
}

export function cancelInvitation(
  app: INestApplication<Server>,
  leader: TestUser,
  questId: string,
  invitationId: string,
): request.Test {
  return withAccessToken(
    request(app.getHttpServer()).delete(`/quests/${questId}/invitations/${invitationId}`),
    leader.accessToken,
  );
}

export function getInvitations(app: INestApplication<Server>, user: TestUser): request.Test {
  return withAccessToken(request(app.getHttpServer()).get('/quest-invitations'), user.accessToken);
}

export function answerInvitation(
  app: INestApplication<Server>,
  user: TestUser,
  invitationId: string,
  answer: 'accept' | 'decline',
): request.Test {
  return withAccessToken(
    request(app.getHttpServer()).post(`/quest-invitations/${invitationId}/${answer}`),
    user.accessToken,
  );
}

export function changeQuest(
  app: INestApplication<Server>,
  leader: TestUser,
  questId: string,
  changes: object,
): request.Test {
  return withAccessToken(request(app.getHttpServer()).patch(`/quests/${questId}`), leader.accessToken).send(changes);
}

export function handOver(
  app: INestApplication<Server>,
  leader: TestUser,
  questId: string,
  userId: string,
): request.Test {
  return withAccessToken(request(app.getHttpServer()).put(`/quests/${questId}/leader`), leader.accessToken).send({
    userId,
  });
}

export function endQuest(app: INestApplication<Server>, leader: TestUser, questId: string): request.Test {
  return withAccessToken(request(app.getHttpServer()).post(`/quests/${questId}/end`), leader.accessToken);
}

export function removeHolder(
  app: INestApplication<Server>,
  leader: TestUser,
  questId: string,
  userId: string,
): request.Test {
  return withAccessToken(
    request(app.getHttpServer()).delete(`/quests/${questId}/holders/${userId}`),
    leader.accessToken,
  );
}

// The User asks to join the Quest, and the id of the request is answered.
export async function joinRequestOf(app: INestApplication<Server>, user: TestUser, questId: string): Promise<string> {
  const response = await askToJoin(app, user, questId);
  if (response.status !== 201) {
    throw new Error(`Asking to join answered ${response.status}: ${JSON.stringify(response.body)}`);
  }
  return z.object({ id: z.string() }).parse(response.body).id;
}

// The Leader invites the User, and the id of the invitation, as the User lists it, is answered.
export async function invitationOf(
  app: INestApplication<Server>,
  leader: TestUser,
  questId: string,
  user: TestUser,
): Promise<string> {
  const response = await invite(app, leader, questId, user.id);
  if (response.status !== 204) {
    throw new Error(`Inviting answered ${response.status}: ${JSON.stringify(response.body)}`);
  }
  const invitations = z.array(z.object({ id: z.string(), quest: z.object({ id: z.string() }) }));
  const found = invitations.parse((await getInvitations(app, user)).body).find(({ quest }) => quest.id === questId);
  if (found === undefined) {
    throw new Error('The invited User lists no invitation into the Quest');
  }
  return found.id;
}

// Changes the Quest's settings, or throws.
export async function setQuest(
  app: INestApplication<Server>,
  leader: TestUser,
  questId: string,
  changes: object,
): Promise<void> {
  const response = await changeQuest(app, leader, questId, changes);
  if (response.status !== 200) {
    throw new Error(`Changing the Quest answered ${response.status}: ${JSON.stringify(response.body)}`);
  }
}
