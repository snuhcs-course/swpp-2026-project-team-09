/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { inject, onTestFinished } from 'vitest';
import { type PrismaService } from '../src/common/prisma.service.js';
import { type GlobalEvent, type PrismaClient } from '../src/generated/prisma/client.js';
import { type TopicsReader } from '../src/interests/topics-reader.js';
import { type TopicsStep } from '../src/interests/topics-step.service.js';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { signInUser, type TestUser } from './friends.js';
import { connectToDatabase, storeEvent } from './quests.js';
import { withAccessToken } from './sign-in.js';
import { startApp } from './start-app.js';
import { TopicsModel } from './topics-model.js';

export const JOB_FAIR = '2026 하반기 채용박람회';
export const BADMINTON = '배드민턴 칠 사람';
// Read alike: the second is 테니스 when 테니스 is in use, and a word of its own when it is not.
export const TENNIS_LESSON = '테니스 원데이 클래스';
export const TENNIS_CLUB = '테니스 동아리 설명회';

// The app with the topics stand-in, and the step the tests run themselves.
export class InterestsStage {
  readonly topics = new TopicsModel();
  app!: INestApplication<Server>;
  prisma!: PrismaClient;
  // The app's own, for spies.
  appPrisma!: PrismaService;
  reader!: TopicsReader;
  private step!: TopicsStep;

  async start(): Promise<void> {
    this.topics.answer(JOB_FAIR, ['채용']);
    this.topics.answer(BADMINTON, ['배드민턴', '운동']);
    this.topics.answer('채용 관련 행사', ['채용']);
    this.topics.answer('배드민턴', ['배드민턴']);
    this.topics.answer(TENNIS_LESSON, ['테니스']);
    this.topics.answer(TENNIS_CLUB, (inUse) => (inUse.includes('테니스') ? ['테니스'] : ['테니스동아리']));
    this.app = await startApp(inject('settings'), [], undefined, undefined, this.topics.model);
    this.prisma = connectToDatabase();
    this.step = this.app.get((await import('../src/interests/topics-step.service.js')).TopicsStep);
    this.reader = this.app.get((await import('../src/interests/topics-reader.js')).TopicsReader);
    this.appPrisma = this.app.get((await import('../src/common/prisma.service.js')).PrismaService);
  }

  async stop(): Promise<void> {
    await this.app.close();
    await this.prisma.$disconnect();
  }

  user(): Promise<TestUser> {
    return signInUser(this.app);
  }

  // Runs the step until `done` holds, since rows other files stored may come first.
  async stepUntil(done: () => Promise<boolean>): Promise<void> {
    for (let step = 0; step < 30; step += 1) {
      // oxlint-disable-next-line no-await-in-loop -- one step after another
      await this.step.run();
      // oxlint-disable-next-line no-await-in-loop -- looked at after each step
      if (await done()) {
        return;
      }
    }
    throw new Error('The topics step never got there');
  }

  runStep(): Promise<void> {
    return this.step.run();
  }

  // Runs the app's clock this far ahead of the real one until the test ends.
  moveClock(ms: number): void {
    const now = vi.spyOn(this.app.get<Clock>(CLOCK), 'now').mockImplementation(() => new Date(Date.now() + ms));
    onTestFinished(() => {
      now.mockRestore();
    });
  }

  async tagged(event: GlobalEvent): Promise<GlobalEvent> {
    await this.stepUntil(async () => (await this.event(event.id)).topicsTries > 0);
    return this.event(event.id);
  }

  event(id: string): Promise<GlobalEvent> {
    return this.prisma.globalEvent.findUniqueOrThrow({ where: { id } });
  }

  // A published job fair on 2087-03-05 from 14:00 in Korea, at 학생회관.
  jobFair(): Promise<GlobalEvent> {
    return storeEvent(this.prisma, {
      title: JOB_FAIR,
      startsAt: new Date('2087-03-05T14:00:00+09:00'),
      endsAt: new Date('2087-03-05T17:00:00+09:00'),
      place: '학생회관',
    });
  }

  get(user: TestUser, path: string): request.Test {
    return withAccessToken(request(this.app.getHttpServer()).get(path), user.accessToken);
  }

  watch(user: TestUser, words: string): request.Test {
    return withAccessToken(request(this.app.getHttpServer()).post('/interests'), user.accessToken).send({ words });
  }

  remove(user: TestUser, id: string): request.Test {
    return withAccessToken(request(this.app.getHttpServer()).delete(`/interests/${id}`), user.accessToken);
  }
}
