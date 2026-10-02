import { type CollectedEvent } from '../src/event/dto/events-collected.dto.js';
import { parseEventPage } from '../src/event/event-page.parser.js';
import { blockPage, savedPage } from './pages.js';

function post(postNumber: number): string {
  return savedPage(`snu-events-post-${postNumber}-2026-10-02`);
}

// The saved page of a post, with `edit` applied, read as the page of that post.
function parsed(postNumber: number, edit = (page: string): string => page): CollectedEvent {
  return parseEventPage(edit(post(postNumber)), postNumber);
}

describe('A post with a time and a place', () => {
  it("gives the start from the body's time line and the place from its place line", () => {
    expect(parsed(176525)).toMatchObject({
      postNumber: 176525,
      sourceUrl: 'https://www.snu.ac.kr/snunow/events?md=v&bbsidx=176525',
      title: '[연합전공 지능형통신] 2027학년도 1학기 선발 및 설명회 안내',
      start: '2026-10-13T17:00:00+09:00',
      end: null,
      readFrom: 'body',
      place: '뉴미디어통신공동연구소 이충웅홀(132동 103호)',
    });
  });

  it('reads a time written in words', () => {
    expect(parsed(176516)).toMatchObject({
      start: '2026-10-07T14:00:00+09:00',
      end: null,
      readFrom: 'body',
      place: '서울대학교 관악캠퍼스 71-1동 체육문화연구동 206호 대형 강의실',
    });
  });

  it('gives no place when the place line is empty', () => {
    // 176525's place line without its place.
    const empty = parsed(176525, (page) =>
      page.replace('- 장소: 뉴미디어통신공동연구소 이충웅홀(132동 103호)', '- 장소:'),
    );

    expect(empty.place).toBeNull();
  });
});

describe('The time line of a post', () => {
  it('reads the end of a time written in words', () => {
    // 176516's time line given an end.
    const withEnd = parsed(176516, (page) => page.replace('오후 2시</span>', '오후 2시 ~ 오후 4시 30분</span>'));

    expect(withEnd).toMatchObject({ start: '2026-10-07T14:00:00+09:00', end: '2026-10-07T16:30:00+09:00' });
  });

  it.each([
    ['the end has no time of day and the start has one', '17:00 ~ 10. 14.(수)'],
    ['the end comes before the start', '17:00 ~ 16:00'],
  ])('gives no end when %s', (_case, time) => {
    // 176525's time line given an end.
    const withEnd = parsed(176525, (page) => page.replace('2026. 10. 13.(화) 17:00', `2026. 10. 13.(화) ${time}`));

    expect(withEnd).toMatchObject({ start: '2026-10-13T17:00:00+09:00', end: null });
  });

  it('does not read a length of time as a time of day', () => {
    // 176516's time line with a length in place of its time.
    const length = parsed(176516, (page) => page.replace('오후 2시</span>', '(3시간)</span>'));

    expect(length).toMatchObject({ start: '2026-10-07', readFrom: 'body' });
  });
});

// 176516, whose time line reads "2026년 10월 7일(수요일) 오후 2시", with another time of day.
function startAt(time: string): CollectedEvent {
  return parsed(176516, (page) => page.replace('오후 2시</span>', `${time}</span>`));
}

describe('The time of day on a time line', () => {
  it.each([
    ['저녁 7시', '19:00'],
    ['오전 10시 30분', '10:30'],
    ['오후 12시', '12:00'],
    ['5:00 PM', '17:00'],
    ['05:00 pm', '17:00'],
  ])('is read from %s, which says whether it is before or after noon', (time, read) => {
    expect(startAt(time).start).toBe(`2026-10-07T${read}:00+09:00`);
  });

  it.each([
    ['14시', '14:00'],
    ['19:30', '19:30'],
    ['09:30', '09:30'],
  ])('is read from %s, on the 24-hour clock', (time, read) => {
    expect(startAt(time).start).toBe(`2026-10-07T${read}:00+09:00`);
  });

  it.each(['2시', '2:00', '7시 30분', '오전 12시'])(
    'is not read from %s, which could be before or after noon',
    (time) => {
      expect(startAt(time)).toMatchObject({ start: '2026-10-07', readFrom: 'body' });
    },
  );
});

describe('The body of a post', () => {
  it('is the description, one line of the page per line', () => {
    expect(parsed(176561).description).toBe(
      [
        '일 시: 2026. 10. 23.(금) 1부(18:30~19:30) / 2부(20:00~21:00)',
        '장 소: 서울대학교 46동 천문대',
        '대 상: 중학교 1학년 이상 누구나',
        '프로그램: 서울대학교 천문대 견학 및 1m 망원경 육안 관측',
        '-1부: 18:30 - 19:30',
        '-2부: 20:00 - 21:00',
        '*1부와 2부에서는 동일한 프로그램이 진행되므로, 둘 중 한 회차에만 참석하실 수 있습니다.',
        '신청마감: 2026. 10. 17.(목) 23:59 (회차 당 35인을 추첨하여 당첨자에게 10월 19일까지 문자와 메일 연락)',
        '신청링크: https://forms.gle/UtCpBAF5uxt6YVuj8 또는 포스터의 QR코드 접속 후 홈페이지 참조',
      ].join('\n'),
    );
  });
});

describe('The body of a post written with lists and a table', () => {
  it('gives each item and each cell a line of its own', () => {
    const { description } = parsed(176549);

    expect(description).toContain(
      [
        '◎ 공모 주제 : ‘학부생의 다전공 이수 경험’',
        '-나의 다전공 신청 및 이수 경험담',
        '-나의 다전공과 진로탐색 이야기',
        '-다전공제도가 나의 성장과 발전에 미친 영향',
        '◎ 공모 자격',
      ].join('\n'),
    );
    expect(description).toContain(['최우수상', '1명', '상금 100만원 및 상장', '우수상'].join('\n'));
  });

  it("gives a post that is not an event the header's date and no place", () => {
    expect(parsed(176549)).toMatchObject({
      title: '2026 다전공 수기공모전',
      start: '2026-10-01',
      end: '2026-10-22',
      readFrom: 'header',
      place: null,
    });
  });
});

describe('A post with an application deadline', () => {
  it('gives the time of the event, and leaves the deadline in the description', () => {
    const event = parsed(176561);

    // The first of two sessions.
    expect(event).toMatchObject({
      start: '2026-10-23T18:30:00+09:00',
      end: '2026-10-23T19:30:00+09:00',
      readFrom: 'body',
      place: '서울대학교 46동 천문대',
    });
    expect(event.description).toContain('신청마감: 2026. 10. 17.(목) 23:59');
  });

  it('gives the time of the event when an application period with times comes first', () => {
    const event = parsed(176525);

    expect(event.start).toBe('2026-10-13T17:00:00+09:00');
    expect(event.description).toContain('□ 신청 기간: 2026. 10. 12.(월) 09:00 ~ 10. 16.(금) 18:00');
  });

  it('reads the labels whatever their spacing, no-break spaces included', () => {
    // 176561 writes its labels with spaces: "일 시", "장 소".
    const noBreakSpaces = parsed(176561, (page) =>
      page.replace('일 시</span>', '일&nbsp;시</span>').replace('장 소</strong>', '장&nbsp; 소</strong>'),
    );

    expect(noBreakSpaces).toMatchObject({ start: '2026-10-23T18:30:00+09:00', place: '서울대학교 46동 천문대' });
  });
});

describe('A post with a date range', () => {
  it('gives the days of the range, and not the application period', () => {
    expect(parsed(176558)).toMatchObject({
      title: '[스포츠진흥원]2026학년도 서울대학교 종합체육대회 개최 안내',
      start: '2026-10-26',
      end: '2026-11-27',
      readFrom: 'body',
      place: '종합운동장, 보조운동장, 종합체육관, 기숙사삼거리 풋살장, 본부 테니스코트',
    });
  });

  it('puts the end in the next year when the range crosses it', () => {
    // 176558's range moved to the turn of the year.
    const newYear = parsed(176558, (page) =>
      page.replace('2026. 10. 26.(월) ~ 11. 27.(금)', '2026. 12. 28.(월) ~ 1. 8.(금)'),
    );

    expect(newYear).toMatchObject({ start: '2026-12-28', end: '2027-01-08' });
  });

  it.each(['일 자', '기 간'])('is read from a time line labelled %s', (label) => {
    // 176558 labels its time line "일 정".
    const relabelled = parsed(176558, (page) => page.replace('○일 정 :', `○${label} :`));

    expect(relabelled).toMatchObject({ start: '2026-10-26', end: '2026-11-27', readFrom: 'body' });
  });
});

describe('A post whose time cannot be read', () => {
  it("gives the header's date, says so, and keeps the text", () => {
    const event = parsed(176564);

    // The header gives the application period; the event is on 17 October.
    expect(event).toMatchObject({ start: '2026-10-01', end: '2026-10-10', readFrom: 'header', place: null });
    expect(event.description).toContain(
      '2026년 10월 17일(토) 10:00~18:00\n서울대학교 관악캠퍼스 32-1동 해동학술문화관 4층',
    );
  });
});

describe('A page that is not the post asked for', () => {
  it('is not read when it is the page of another post', () => {
    expect(() => parseEventPage(post(176525), 176558)).toThrow('The page is not post 176558');
  });

  it("is not read when it is the firewall's block page", () => {
    expect(() => parseEventPage(blockPage, 176525)).toThrow('The page has no post');
  });
});
