/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { z } from 'zod';
import { type QuestProposal } from '../src/assistant/proposal.js';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { postAssistantMessages } from './assistant.js';
import { befriend, signInUser, TestUser } from './friends.js';
import { invitationOf } from './quest-recruiting.js';
import { connectToDatabase, makeQuest } from './quests.js';
import { ScriptedModel } from './scripted-model.js';
import { withAccessToken } from './sign-in.js';
import { startApp } from './start-app.js';
import { refuseKakao } from './walking-route.js';

// The stage of the tests of a 파티 made with 만들기 and changed in place from the Assistant (P05 ticket 30): the app on
// 2096-05-07 09:00 in Korea, the leader with two Friends, 민수 and 지은, the Places 301동 and 302동, and the steps of
// making a Proposal, asking for a change, and pressing 바꾸기.

export const LUNCH: QuestProposal = {
  title: '2096 학식 같이 먹어요',
  description: '내일 점심 학식 같이 먹을 사람 모집해요',
  joinPolicy: 'open',
  board: 'meal',
  capacity: 4,
  startsAt: '2096-05-08T12:00:00+09:00',
  place: null,
  globalEvent: null,
  invitees: [],
};

const changeSchema = z.object({
  proposal: z.object({
    change: z.object({ questId: z.string(), subQuestId: z.string(), step: z.object({}).loose(), told: z.number() }),
  }),
});

export class MadePartyStage {
  readonly model = new ScriptedModel();
  app!: INestApplication<Server>;
  prisma!: PrismaClient;
  leader!: TestUser;
  minsu!: TestUser;
  jieun!: TestUser;
  place301!: string;
  place302!: string;

  async start(): Promise<void> {
    this.app = await startApp(inject('settings'), [], refuseKakao, this.model.model);
    vi.spyOn(this.app.get<Clock>(CLOCK), 'now').mockReturnValue(new Date('2096-05-07T00:00:00Z'));
    this.prisma = connectToDatabase();
    [this.leader, this.minsu, this.jieun] = [
      await signInUser(this.app),
      await signInUser(this.app),
      await signInUser(this.app),
    ];
    await befriend(this.app, this.leader, this.minsu);
    await befriend(this.app, this.leader, this.jieun);
    this.place301 = (await this.prisma.place.findFirstOrThrow({ where: { number: '301' } })).id;
    this.place302 = (await this.prisma.place.findFirstOrThrow({ where: { number: '302' } })).id;
  }

  async stop(): Promise<void> {
    await this.prisma.$disconnect();
    await this.app.close();
  }

  // Makes the Proposal as 만들기 does, and answers the Quest's id.
  made = async (proposal: QuestProposal): Promise<string> => {
    const { title, description, joinPolicy, board, capacity, startsAt, invitees, place } = proposal;
    const response = await makeQuest(this.app, this.leader, {
      title,
      subQuest: { title, startsAt, place: place === null ? null : { placeId: place.id } },
      capacity,
      joinPolicy,
      ...(board === null ? {} : { board, description }),
    });
    const { id } = z.object({ id: z.string() }).parse(response.body);
    for (const { id: userId } of invitees) {
      // oxlint-disable-next-line no-await-in-loop -- one invitation at a time, as the party form sends them
      await invitationOf(this.app, this.leader, id, userId === this.minsu.id ? this.minsu : this.jieun);
    }
    return id;
  };

  // The conversation after 만들기, the User asking for a change in their last message.
  afterMaking = (proposal: QuestProposal, questId: string, asked = '방금 만든 파티 시간 바꿔줘'): object[] => [
    { role: 'user', text: '파티 만들어줘' },
    {
      role: 'assistant',
      text: '만들기를 누르면 파티가 만들어져요.',
      cards: [],
      proposal: { ...proposal, madeQuestId: questId },
    },
    { role: 'user', text: asked },
  ];

  // The User asks for a change, and the model calls proposeQuest with `given`.
  ask = (proposal: QuestProposal, questId: string, given: object): request.Test => {
    this.model.script({ tool: 'proposeQuest', input: given }, { text: '…' });
    return postAssistantMessages(this.app, this.leader.accessToken, this.afterMaking(proposal, questId), {
      clientCapabilities: ['party-change'],
    });
  };

  // Presses 바꾸기: the step goes to the room's 일정 수정 as it is.
  pressChange = (body: unknown): request.Test => {
    const { change } = changeSchema.parse(body).proposal;
    return withAccessToken(
      request(this.app.getHttpServer()).put(`/quests/${change.questId}/sub-quests/${change.subQuestId}`),
      this.leader.accessToken,
    ).send(change.step);
  };

  stepOf = (questId: string): Promise<{ startsAt: Date | null; placeId: string | null }> =>
    this.prisma.subQuest.findFirstOrThrow({ where: { questId }, select: { startsAt: true, placeId: true } });

  // The room's 일정 수정 of the 파티's one step, as a Holder makes it after 만들기.
  editedInRoom = async (questId: string, step: object): Promise<void> => {
    const { id } = await this.prisma.subQuest.findFirstOrThrow({ where: { questId } });
    const edited = await withAccessToken(
      request(this.app.getHttpServer()).put(`/quests/${questId}/sub-quests/${id}`),
      this.leader.accessToken,
    ).send({ title: LUNCH.title, ...step });
    if (edited.status !== 200) {
      throw new Error(`The room's edit answered ${edited.status}: ${JSON.stringify(edited.body)}`);
    }
  };
}
