import { PrismaPg } from '@prisma/adapter-pg';
import { inject } from 'vitest';
import { GlobalEvent, PrismaClient } from '../src/generated/prisma/client.js';
import { collectedEvent, eventsMessage, postNumbersFrom } from './global-events.js';
import { sendAsWorker, startWithWorker, type WorkerHarness } from './worker.js';

let harness: WorkerHarness;
// No route serves Global Events yet (P12 adds them), so the tests read them with a connection of their own.
let prisma: PrismaClient;

beforeAll(async () => {
  harness = await startWithWorker();
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: inject('settings').DATABASE_URL }) });
});

afterAll(async () => {
  await prisma.$disconnect();
  await harness.close();
});

const newPost = postNumbersFrom(900_000);

// Sends a post of its own, with `changes` applied, and gives what was stored of it.
async function collect(changes: object): Promise<GlobalEvent | null> {
  const postNumber = newPost();
  await sendAsWorker(harness.worker, 'events-collected', eventsMessage([collectedEvent(postNumber, changes)]));
  return prisma.globalEvent.findUnique({ where: { postNumber } });
}

// 뉴미디어통신공동연구소, 132동, on the campus map.
const building132 = { latitude: 37.45487, longitude: 126.95407 };

const noPosition = { latitude: null, longitude: null };

describe('A collected event whose time and place were read', () => {
  it("is published at the position of the building its place names, with the post's text", async () => {
    const postNumber = newPost();

    await expect(
      sendAsWorker(harness.worker, 'events-collected', eventsMessage([collectedEvent(postNumber)])),
    ).resolves.toEqual({ status: 'ok' });

    expect(await prisma.globalEvent.findUnique({ where: { postNumber } })).toMatchObject({
      state: 'published',
      title: '[연합전공 지능형통신] 2027학년도 1학기 선발 및 설명회 안내',
      description: '- 일시: 2026. 10. 13.(화) 17:00\n- 장소: 뉴미디어통신공동연구소 이충웅홀(132동 103호)',
      startsAt: new Date('2026-10-13T08:00:00Z'),
      endsAt: null,
      place: '뉴미디어통신공동연구소 이충웅홀(132동 103호)',
      ...building132,
      version: 1,
      postNumber,
      sourceUrl: `https://www.snu.ac.kr/snunow/events?md=v&bbsidx=${postNumber}`,
    });
  });

  it('is published with its end when one was read', async () => {
    expect(await collect({ end: '2026-10-13T19:00:00+09:00' })).toMatchObject({
      state: 'published',
      endsAt: new Date('2026-10-13T10:00:00Z'),
    });
  });
});

describe('A collected event that cannot be published', () => {
  it("is a Draft, with the days read, when its start is the header's date", async () => {
    expect(await collect({ start: '2026-10-12', end: '2026-10-16', readFrom: 'header' })).toMatchObject({
      state: 'draft',
      // 00:00 in Asia/Seoul.
      startsAt: new Date('2026-10-11T15:00:00Z'),
      endsAt: new Date('2026-10-15T15:00:00Z'),
      place: '뉴미디어통신공동연구소 이충웅홀(132동 103호)',
      ...building132,
    });
  });

  it("is a Draft when its start has a time but was read from the header's date", async () => {
    expect(await collect({ readFrom: 'header' })).toMatchObject({ state: 'draft' });
  });

  it("is a Draft when the body's time line gave a day without a time of day", async () => {
    expect(await collect({ start: '2026-10-13' })).toMatchObject({
      state: 'draft',
      startsAt: new Date('2026-10-12T15:00:00Z'),
    });
  });

  it('is a Draft without a start when no day was read', async () => {
    expect(await collect({ start: null, readFrom: null })).toMatchObject({ state: 'draft', startsAt: null });
  });

  it.each([
    ['a building number the list does not hold', '서울대학교 999동 101호'],
    ['two buildings by number', '제1공학관(301동) 및 제2공학관(302동)'],
    ['a name that several buildings share', '행정대학원 국제회의실'],
    ['no building, being online', '온라인 (Zoom)'],
  ])('is a Draft without a position when its place names %s', async (_case, place) => {
    expect(await collect({ place })).toMatchObject({ state: 'draft', place, ...noPosition });
  });

  it('is a Draft when no place was read', async () => {
    expect(await collect({ place: null })).toMatchObject({ state: 'draft', place: null, ...noPosition });
  });
});

describe('The place of a collected event', () => {
  it.each([
    // 종합운동장 has no number.
    ['by name', '서울대학교 종합운동장', { latitude: 37.464779176159, longitude: 126.95009153903 }],
    // 자하연 is a place of its own, and 자하연식당 is 109동.
    ['by the longer of two names it holds', '자하연식당 2층', { latitude: 37.46098, longitude: 126.95252 }],
    // Seven buildings are named (관악사)학부 생활관.
    [
      'by its number alone when it writes one',
      '(관악사)학부 생활관 919동',
      { latitude: 37.46306, longitude: 126.95872 },
    ],
    // OpenStreetMap names 901동 "901".
    [
      'by name, not by a name that is a number',
      '글로벌공학교육센터 901호',
      { latitude: 37.4549, longitude: 126.95062 },
    ],
    // The campus map writes 중앙도서관 관정관, 62-1동.
    ['by name, whatever its spacing', '중앙도서관관정관 6층', { latitude: 37.45903, longitude: 126.95247 }],
    // The campus map writes SK경영관, 58동.
    [
      'by name, whatever the case of its Latin letters',
      'sk경영관 B101호',
      { latitude: 37.46568, longitude: 126.95203 },
    ],
  ])('names a building %s', async (_case, place, position) => {
    expect(await collect({ place })).toMatchObject({ state: 'published', ...position });
  });

  it('names no building by a number that is part of a word, as in an address', async () => {
    // Not 1동, 인문관1.
    const place = '서울특별시 강남구 역삼1동 GS타워';

    expect(await collect({ place })).toMatchObject({ state: 'draft', place, ...noPosition });
  });
});
