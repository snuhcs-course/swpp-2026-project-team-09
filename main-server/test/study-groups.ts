/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-20  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import request from 'supertest';
import { z } from 'zod';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { type TravelProvider } from '../src/travel/travel.js';
import { ask, postAssistantMessages } from './assistant.js';
import { befriend, signInUser, type TestUser } from './friends.js';
import { type LibraryCardBody, libraryCards, resolving } from './library.js';
import { ScriptedModel } from './scripted-model.js';
import { withAccessToken } from './sign-in.js';
import { startApp } from './start-app.js';
import { addClass } from './timetable.js';
import { refuseKakao } from './walking-route.js';

// The stage of a study group's time picked by the Assistant, at its endpoint with the scripted model, on the design's
// example week: Tuesday 2026-11-03 at 10:00 in Korea, so that a room can be booked up to Friday 2026-11-06. Thursday's
// Classes are the design's table; 민수 also has Classes from 09:00 to 21:45 on Tuesday, Wednesday and Friday, so that
// Thursday is the pick, and until 22:50 on Saturday, which leaves him no time that day. On foot to and from 관정관
// (62-1): 301동 14 minutes, 24동 4, 두산인문관 (8동) 4, 302동 16. The week is the room request files' week, before
// their Thursday: any read of a room request expires and closes every request by its own file's clock.

export const NOW = new Date('2026-11-03T10:00:00+09:00');

export const ANSWER = { clientCapabilities: ['library', 'answer'] };

export const SITE_NOTES = [
  '예약한 뒤 1시간 안에 들어가지 않으면 취소돼요.',
  '7일에 3번 들어가지 않으면 3일 동안 예약할 수 없어요.',
  '들어가려면 학생증(S-CARD)이 필요해요. 다른 사람의 학번으로 예약하면 취소되고 30일 동안 예약할 수 없어요.',
];

export interface Group {
  me: TestUser;
  minsu: TestUser;
  jieun: TestUser;
  seojun: TestUser;
}

export const friendIdsOf = ({ minsu, jieun, seojun }: Group): string[] => [minsu.id, jieun.id, seojun.id];

export const companionsOf = ({ minsu, jieun, seojun }: Group): object[] => [
  { friendId: minsu.id, name: '민수' },
  { friendId: jieun.id, name: '지은' },
  { friendId: seojun.id, name: '서준' },
];

const notificationsSchema = z.array(
  z.object({
    kind: z.string(),
    title: z.string(),
    ahead: z.string().nullable(),
    line: z.string(),
    at: z.string(),
    url: z.string(),
  }),
);

export type NotificationsBody = z.infer<typeof notificationsSchema>;

const on = (weekday: string, startTime: string, endTime: string, placeId: string): object => ({
  weekday,
  startTime,
  endTime,
  placeId,
  room: null,
});

const walksOf = (walks: Map<string, number>): TravelProvider => ({
  walkingSeconds: (from, to) => walks.get(`${from}>${to}`) ?? 3600,
  travel: (from, to) => ({ seconds: walks.get(`${from}>${to}`) ?? 3600, mode: 'walk' }),
});

export class StudyStage {
  readonly model = new ScriptedModel();
  app!: INestApplication<Server>;
  private readonly walks = new Map<string, number>();
  private places!: Record<'b301' | 'b24' | 'b8' | 'b302', string>;

  async start(settings: Record<string, string | undefined>): Promise<void> {
    this.app = await startApp(settings, [], refuseKakao, this.model.model, [], walksOf(this.walks));
    vi.spyOn(this.app.get<Clock>(CLOCK), 'now').mockReturnValue(NOW);
    const { accessToken } = await signInUser(this.app);
    const listed = await withAccessToken(request(this.app.getHttpServer()).get('/places'), accessToken).expect(200);
    const all = z.array(z.object({ id: z.string(), number: z.string().nullable() })).parse(listed.body);
    const numbered = (number: string): string => {
      const place = all.find((each) => each.number === number);
      if (place === undefined) {
        throw new Error(`The seed has no Place numbered ${number}`);
      }
      return place.id;
    };
    const kwanjeong = numbered('62-1');
    this.places = { b301: numbered('301'), b24: numbered('24'), b8: numbered('8'), b302: numbered('302') };
    for (const [placeId, minutes] of [
      [this.places.b301, 14],
      [this.places.b24, 4],
      [this.places.b8, 4],
      [this.places.b302, 16],
    ] as const) {
      this.walks.set(`${placeId}>${kwanjeong}`, minutes * 60);
      this.walks.set(`${kwanjeong}>${placeId}`, minutes * 60);
    }
  }

  stop(): Promise<void> {
    return this.app.close();
  }

  user(name: string): Promise<TestUser> {
    return signInUser(this.app, { name, department: '컴퓨터공학부' });
  }

  // The booker and the three Friends, each with the week's Classes.
  async group(): Promise<Group> {
    const [me, minsu, jieun, seojun] = [
      await this.user('유상'),
      await this.user('민수'),
      await this.user('지은'),
      await this.user('서준'),
    ];
    for (const friend of [minsu, jieun, seojun]) {
      // oxlint-disable-next-line no-await-in-loop -- one Friend Request at a time
      await befriend(this.app, me, friend);
    }
    const { b301, b24, b8, b302 } = this.places;
    await this.lesson(me, '알고리즘', [on('thursday', '14:00', '15:15', b301)]);
    await this.lesson(seojun, '물리학', [on('thursday', '13:00', '13:50', b24), on('thursday', '14:00', '14:50', b24)]);
    await this.lesson(jieun, '철학', [
      on('thursday', '14:00', '15:15', b8),
      on('thursday', '17:00', '18:15', b8),
      on('thursday', '18:30', '22:00', b8),
    ]);
    await this.lesson(minsu, '공학수학', [
      ...['tuesday', 'wednesday', 'friday'].map((weekday) => on(weekday, '09:00', '21:45', b302)),
      on('thursday', '09:30', '10:45', b302),
      on('thursday', '11:00', '12:15', b302),
      on('thursday', '12:30', '13:45', b302),
      on('thursday', '15:30', '16:45', b302),
      on('saturday', '09:00', '22:50', b302),
    ]);
    return { me, minsu, jieun, seojun };
  }

  // "민수, 지은, 서준이랑 … 스터디", with the tool given these inputs beside the Friends.
  async study(
    people: Group,
    input: object,
    more: object = ANSWER,
  ): Promise<{ cards: LibraryCardBody[]; result: unknown }> {
    this.model.script(
      resolving('민수'),
      resolving('지은'),
      resolving('서준'),
      { tool: 'proposeStudyRoom', input: { friendIds: friendIdsOf(people), ...input } },
      { text: '…' },
    );
    const response = await postAssistantMessages(
      this.app,
      people.me.accessToken,
      ask('민수, 지은, 서준이랑 스터디'),
      more,
    );
    expect(response.status).toBe(200);
    return { cards: libraryCards(response.body), result: this.model.toolResults()[3] };
  }

  async notifications(user: TestUser): Promise<NotificationsBody> {
    const response = await withAccessToken(request(this.app.getHttpServer()).get('/notifications'), user.accessToken);
    expect(response.status).toBe(200);
    return notificationsSchema.parse(response.body);
  }

  async kinds(user: TestUser): Promise<string[]> {
    return (await this.notifications(user)).map(({ kind }) => kind);
  }

  // POST /library/room-requests, as the card's button makes it.
  makeRequest(user: TestUser, body: object): request.Test {
    return withAccessToken(request(this.app.getHttpServer()).post('/library/room-requests'), user.accessToken)
      .set('Idempotency-Key', randomUUID())
      .send(body);
  }

  roomRequest(user: TestUser, path: string, method: 'get' | 'post' = 'get'): request.Test {
    return withAccessToken(
      request(this.app.getHttpServer())[method](`/library/room-requests/${path}`),
      user.accessToken,
    );
  }

  private async lesson(who: TestUser, courseName: string, times: object[]): Promise<void> {
    await addClass(this.app, who.accessToken, { courseName, times });
  }
}
