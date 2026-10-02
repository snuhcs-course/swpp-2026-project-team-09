import { PrismaPg } from '@prisma/adapter-pg';
import { inject } from 'vitest';
import { CollectionStatus, GlobalEvent, PrismaClient } from '../src/generated/prisma/client.js';
import { collectedEvent, eventsMessage, invalidEventsMessages, postNumbersFrom } from './global-events.js';
import { refusal, sendAsWorker, startWithWorker, type WorkerHarness } from './worker.js';

let harness: WorkerHarness;
// No route serves Global Events or the Collection status yet (P12 adds them), so the tests read them with a connection
// of their own.
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

function storedEvent(postNumber: number): Promise<GlobalEvent | null> {
  return prisma.globalEvent.findUnique({ where: { postNumber } });
}

// Only this file stores events as the events list's Source, so no other file changes its status meanwhile.
function eventsStatus(): Promise<CollectionStatus | null> {
  return prisma.collectionStatus.findUnique({ where: { source: 'snu_events' } });
}

// Sends a post of its own, with `changes` applied, and gives what was stored of it.
async function collect(changes: object): Promise<GlobalEvent | null> {
  const postNumber = newPost();
  await sendAsWorker(harness.worker, 'events-collected', eventsMessage([collectedEvent(postNumber, changes)]));
  return storedEvent(postNumber);
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

    expect(await storedEvent(postNumber)).toMatchObject({
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
      ...building132,
    });
  });

  it.each([
    ["a time read from the header's date", { readFrom: 'header' }, { startsAt: new Date('2026-10-13T08:00:00Z') }],
    [
      "a day without a time from the body's time line",
      { start: '2026-10-13' },
      { startsAt: new Date('2026-10-12T15:00:00Z') },
    ],
    ['no day read', { start: null, readFrom: null }, { startsAt: null }],
  ])('is a Draft when its start is %s', async (_case, changes, stored) => {
    expect(await collect(changes)).toMatchObject({ state: 'draft', ...stored });
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
    // 유전공학연구소 is 105동, and 유전공학연구소 신관 105-2동.
    [
      'by the longer of two names',
      '유전공학연구소 신관 2층',
      { latitude: 37.4540404461522, longitude: 126.95336213875 },
    ],
    // 자하연 is a place of its own, and 자하연식당 is 109동.
    ['by a whole name, not one inside it', '자하연식당 2층', { latitude: 37.46098, longitude: 126.95252 }],
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
    ['by name, whatever the case', 'sk경영관 B101호', { latitude: 37.46568, longitude: 126.95203 }],
  ])('names a building %s', async (_case, place, position) => {
    expect(await collect({ place })).toMatchObject({ state: 'published', ...position });
  });

  it.each([
    // Not 1동, 인문관1.
    ['a number that is part of a word, as in an address', '서울특별시 강남구 역삼1동 GS타워'],
    // Not 박물관, 70동, nor 행정관, 60동.
    ['a name that ends a word', '국립중앙박물관 대강당'],
    ['a name that begins a word', '행정관리팀 사무실'],
    // Not 행정관, 60동, nor 1동.
    ['a building of another campus by name', '서울대학교 연건캠퍼스 의과대학 행정관'],
    ['a building of another campus by number', '연건캠퍼스 1동 강의실'],
  ])('names no building when it holds %s', async (_case, place) => {
    expect(await collect({ place })).toMatchObject({ state: 'draft', place, ...noPosition });
  });
});

describe('A post that is already stored', () => {
  it('is stored once when it is sent twice', async () => {
    const postNumber = newPost();
    const message = eventsMessage([collectedEvent(postNumber)]);
    await sendAsWorker(harness.worker, 'events-collected', message);
    const stored = await storedEvent(postNumber);

    await expect(sendAsWorker(harness.worker, 'events-collected', message)).resolves.toEqual({ status: 'ok' });

    expect(await storedEvent(postNumber)).toEqual(stored);
  });

  it.each([
    ['published', {}],
    // Moved to 제2공학관, 302동.
    [
      'edited',
      { title: '설명회 (장소 변경)', place: '제2공학관 101호', latitude: 37.44887, longitude: 126.95265, version: 2 },
    ],
    ['discarded', { state: 'discarded' as const }],
  ])('is left as it is when it was %s', async (_case, changes) => {
    const postNumber = newPost();
    await sendAsWorker(harness.worker, 'events-collected', eventsMessage([collectedEvent(postNumber)]));
    // As an Administrator would change it.
    const stored = await prisma.globalEvent.update({ where: { postNumber }, data: changes });

    // The post as a later Collection would read it, had the Source changed it.
    const changed = collectedEvent(postNumber, { title: '설명회 (온라인 전환)', place: '온라인 (Zoom)' });
    await sendAsWorker(
      harness.worker,
      'events-collected',
      eventsMessage([changed], { collectedAt: '2026-10-02T12:00:00+09:00' }),
    );

    expect(await storedEvent(postNumber)).toEqual(stored);
  });
});

describe('An events message that does not match the schema', () => {
  it.each(invalidEventsMessages)(
    'is refused when it has %s, and nothing from it is stored',
    async (_problem, message, named) => {
      const [valid, other] = [newPost(), newPost()];
      const status = await eventsStatus();

      expect(await refusal(harness.worker, 'events-collected', message(valid, other))).toContain(named);
      expect(await storedEvent(valid)).toBeNull();
      expect(await eventsStatus()).toEqual(status);
    },
  );
});

describe('A Collection of the events list', () => {
  it('is recorded with its time when its message is stored', async () => {
    await sendAsWorker(
      harness.worker,
      'events-collected',
      eventsMessage([], { collectedAt: '2026-10-02T18:00:00+09:00' }),
    );

    expect(await eventsStatus()).toMatchObject({ lastSucceededAt: new Date('2026-10-02T09:00:00Z') });
  });

  it('that failed is recorded with its time and reason, and the stored events stay', async () => {
    const postNumber = newPost();
    await sendAsWorker(harness.worker, 'events-collected', eventsMessage([collectedEvent(postNumber)]));
    const stored = await storedEvent(postNumber);

    await expect(
      sendAsWorker(harness.worker, 'collection-failed', {
        source: 'snu_events',
        failedAt: '2026-10-03T00:00:00+09:00',
        reason: 'The page has no post',
      }),
    ).resolves.toEqual({ status: 'ok' });

    expect(await eventsStatus()).toMatchObject({
      lastFailedAt: new Date('2026-10-02T15:00:00Z'),
      lastFailureReason: 'The page has no post',
    });
    expect(await storedEvent(postNumber)).toEqual(stored);
  });
});
