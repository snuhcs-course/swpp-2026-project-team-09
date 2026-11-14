/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Logger } from '@nestjs/common';
import { inject } from 'vitest';
import { type TestUser } from './friends.js';
import { LONG_KEY, ROOM_LABEL, RoomStage } from './room-requests.js';

// A study room's plan stays when a companion declines: the booker is told who cannot come and how many more the room
// needs, asks one more Friend, and is told when everyone left agreed and, once booked, when the room ends.

// Each test signs in five Users and befriends them over HTTP before it starts, which takes up to 4 s on a loaded
// runner: close to Vitest's 5 s.
vi.setConfig({ testTimeout: 15_000 });

const stage = new RoomStage();

beforeAll(() => stage.start(inject('settings')));

afterAll(() => stage.stop());

// 유상 and his Friends 민수, 지은, 서준 and 하은.
function fivePeople(): Promise<readonly [TestUser, TestUser, TestUser, TestUser, TestUser]> {
  return stage.party(['유상', '민수', '지은', '서준', '하은'] as const);
}

describe('A companion declining a request of four people for the six-person room', () => {
  it('leaves the request gathering with the booking party, and tells the booker one more is needed', async () => {
    const [yusang, minsu, jieun, seojun] = await fivePeople();
    const { id, questId } = await stage.made(yusang, [minsu, jieun, seojun], LONG_KEY);
    await stage.consent(minsu, id).expect(200);
    await stage.decline(jieun, id).expect(204);

    expect(await stage.status(yusang, id)).toMatchObject({ status: 'gathering', moreNeeded: 1 });
    expect(await stage.states(yusang, id)).toEqual({ 민수: 'consented', 지은: 'declined', 서준: 'asked' });
    const party = await stage.prisma.quest.findUniqueOrThrow({
      where: { id: questId },
      include: { holders: true, invitations: true },
    });

    expect(party.holders.map(({ userId }) => userId).toSorted()).toEqual([yusang.id, minsu.id].toSorted());
    expect(party.invitations.map(({ userId }) => userId)).toEqual([seojun.id]);
    expect(await stage.notificationsOf(yusang, 'room-declined')).toEqual([
      expect.objectContaining({
        kind: 'room-declined',
        title: '지은이 못 온대요',
        line: '관정 4층 6인실 · 1명 더 필요해요',
        url: `/main?card=party:${questId}`,
      }),
    ]);
    for (const user of [yusang, minsu, jieun, seojun]) {
      // oxlint-disable-next-line no-await-in-loop -- one User at a time
      expect(await stage.notices(user)).toEqual([]);
    }
  });

  it('becomes ready once a Friend asked in their place and everyone left consent, and the booker is told', async () => {
    const [yusang, minsu, jieun, seojun, haeun] = await fivePeople();
    const { id, questId } = await stage.made(yusang, [minsu, jieun, seojun], LONG_KEY);
    await stage.decline(jieun, id).expect(204);
    const asked = await stage.askOneMore(yusang, id, haeun.id).expect(201);

    expect(asked.body).toMatchObject({ status: 'gathering', moreNeeded: 0 });

    await stage.allConsent(id, [minsu, seojun, haeun]);

    expect(await stage.status(yusang, id)).toMatchObject({ status: 'ready', moreNeeded: 0 });
    expect(await stage.notificationsOf(yusang, 'room-agreed')).toEqual([
      expect.objectContaining({
        title: '모두 동의했어요',
        line: `목 15:30–18:30 ${ROOM_LABEL}`,
        url: `/main?card=party:${questId}`,
      }),
    ]);
  });
});

describe('A companion declining a request of five people', () => {
  it('leaves the minimum met: the plan stays, and the others’ consents make it ready at once', async () => {
    const [yusang, ...friends] = await fivePeople();
    const [minsu, jieun, seojun, haeun] = friends;
    const { id } = await stage.made(yusang, friends, LONG_KEY);
    await stage.decline(jieun, id).expect(204);

    expect((await stage.notificationsOf(yusang, 'room-declined'))[0]).toMatchObject({
      title: '지은이 못 온대요',
      line: '관정 4층 6인실 · 계획은 그대로예요',
    });

    await stage.allConsent(id, [minsu, seojun, haeun]);

    expect(await stage.status(yusang, id)).toMatchObject({ status: 'ready', moreNeeded: 0 });
  });
});

describe('A companion declining when the booker cannot be told', () => {
  it('is answered as before, and the failure is logged as a warning', async () => {
    const { NotificationsService } = await import('../src/notifications/notifications.service.js');
    const schedule = vi
      .spyOn(stage.app.get(NotificationsService), 'schedule')
      .mockRejectedValue(new Error('Redis refused the write'));
    const warn = vi.spyOn(Logger.prototype, 'warn');
    try {
      const [yusang, minsu, jieun, seojun] = await fivePeople();
      const { id } = await stage.made(yusang, [minsu, jieun, seojun], LONG_KEY);
      await stage.decline(jieun, id).expect(204);

      expect((await stage.status(yusang, id)).status).toBe('gathering');
      await vi.waitFor(() => {
        expect(warn).toHaveBeenCalledWith(`A room request's Notification was not kept: Error: Redis refused the write`);
      });
    } finally {
      schedule.mockRestore();
      warn.mockRestore();
    }
  });
});

describe('A booked room', () => {
  it('keeps "10분 뒤 끝나요" for each Holder at its end minus 10 minutes, and its cancel forgets them', async () => {
    const [yusang, minsu, jieun, seojun] = await fivePeople();
    const holders = [yusang, minsu, jieun, seojun];
    const { id, questId } = await stage.made(yusang, [minsu, jieun, seojun], LONG_KEY);
    await stage.allConsent(id, [minsu, jieun, seojun]);
    await stage.result(yusang, id, { ok: true }).expect(204);

    for (const holder of holders) {
      // oxlint-disable-next-line no-await-in-loop -- one User at a time
      expect(await stage.notificationsOf(holder, 'room-ending')).toEqual([
        {
          id: `room-ending:party:${questId}`,
          kind: 'room-ending',
          title: '10분 뒤 끝나요',
          ahead: '18:30 방 예약 끝',
          line: '관정 4층 6인실 · 18:30에 끝나요',
          at: '2026-11-05T18:20:00+09:00',
          url: `/main?card=party:${questId}`,
        },
      ]);
    }

    await stage.cancelled(yusang, id).expect(204);

    for (const holder of holders) {
      // oxlint-disable-next-line no-await-in-loop -- one User at a time
      await vi.waitFor(async () => {
        expect((await stage.notifications(holder)).map(({ kind }) => kind)).not.toContain('room-ending');
      });
    }
  });
});
