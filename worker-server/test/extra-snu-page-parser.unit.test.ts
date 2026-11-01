/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type CollectedPost } from '../src/event/dto/events-collected.dto.js';
import { parseExtraSnuPage } from '../src/event/extra-snu-page.parser.js';
import { savedPage } from './pages.js';

function programme(key: string): string {
  return savedPage(`extra-snu-programme-${key}-2026-10-31`);
}

function parsed(key: string): CollectedPost {
  return parseExtraSnuPage(programme(key), key);
}

describe("The main text's links", () => {
  it('give where they lead, whatever their words, and no mail address', () => {
    const page = programme('PGM012002170').replace(
      /(주요내용[\s\S]*?class="td_box"[^>]*>)/u,
      `$1<a href="https://www.snu.ac.kr/snunow/events?md=v&amp;bbsidx=178226">공지</a><a href="mailto:a@snu.ac.kr">메일</a>`,
    );

    expect(parseExtraSnuPage(page, 'PGM012002170').links).toEqual([
      'https://www.snu.ac.kr/snunow/events?md=v&bbsidx=178226',
    ]);
  });

  it("leave out the rest of the page, such as the programme's homepage field", () => {
    expect(parsed('PGM012002170').links).toEqual([]);
  });
});

describe('A programme with one session', () => {
  it("gives the session's time and place from their fields, read as the rules read a post's own time", () => {
    expect(parsed('PGM012002414')).toMatchObject({
      key: 'PGM012002414',
      address: 'https://extra.snu.ac.kr/ptfol/pgm/view.do?dataSeq=PGM012002414',
      title: 'IEEE Authorship Seminar',
      sessions: [
        {
          number: 1,
          start: '2026-11-02T10:00:00+09:00',
          end: '2026-11-02T11:00:00+09:00',
          readFrom: 'body',
          place: '중앙도서관 관정관 3층 양두석홀',
        },
      ],
    });
  });

  it('has no title of its own: the programme has only the one session', () => {
    expect(parsed('PGM012002414').sessions[0]).not.toHaveProperty('title');
  });

  it('gives the summary, the session, the application period and the main text as its description, line by line', () => {
    const lines = parsed('PGM012002414').description.split('\n');

    expect(lines.slice(0, 3)).toEqual([
      '해외 저널 출판 전문가를 초청하여 듣는 논문 작성 및 투고 관련 특강',
      '[1회차] 기간: 2026.11.02. 10:00 ~ 2026.11.02. 11:00 / 장소: 중앙도서관 관정관 3층 양두석홀',
      '신청기간: 2026.10.28. 12:00 ~ 2026.11.02. 09:00',
    ]);
    expect(lines).toContain('일시 : 2026. 11. 2.(월) 10:00 ~ 11:00');
    expect(lines).toContain('장소 : 중앙도서관 관정관 3층 양두석홀');
  });

  it("masks e-mail addresses, which the site's notice refuses to have collected", () => {
    const page = programme('PGM012002414');
    expect(page).toMatch(/[\w.]+@[\w.]+/u);

    const { description } = parsed('PGM012002414');

    expect(description).not.toMatch(/@/u);
    expect(description).toContain('[이메일]');
  });
});

describe('A programme with several sessions', () => {
  it('gives a line of its description for each, before the application period', () => {
    const lines = parsed('PGM012002329').description.split('\n');
    const application = lines.findIndex((line) => line.startsWith('신청기간:'));

    expect(lines.slice(application - 2, application)).toEqual([
      '[1회차] 기간: 2026.12.01. 10:00 ~ 2026.12.01. 12:00 / 장소: 비대면(온라인)',
      '[2회차] 기간: 2026.12.02. 10:00 ~ 2026.12.02. 12:00 / 장소: 비대면(온라인)',
    ]);
  });

  it('gives each session with its number, its time and a title of the programme and that number', () => {
    const { title, sessions } = parsed('PGM012002329');

    expect(sessions).toMatchObject([
      {
        number: 1,
        title: `${title} (1회차)`,
        start: '2026-12-01T10:00:00+09:00',
        end: '2026-12-01T12:00:00+09:00',
        readFrom: 'body',
        place: '비대면(온라인)',
      },
      {
        number: 2,
        title: `${title} (2회차)`,
        start: '2026-12-02T10:00:00+09:00',
        end: '2026-12-02T12:00:00+09:00',
        readFrom: 'body',
        place: '비대면(온라인)',
      },
    ]);
  });
});

describe('A session whose fields the rules should not publish as they stand', () => {
  it('over more than a day keeps its time for a person, but not as a time the rules read', () => {
    expect(parsed('PGM012002170').sessions).toMatchObject([
      { start: '2026-09-03T09:00:00+09:00', end: '2026-12-31T23:59:00+09:00', readFrom: null },
    ]);
  });

  it('starting at 00:00, which stands for no time of day, gives its start as a day', () => {
    expect(parsed('PGM012002188').sessions).toMatchObject([{ start: '2026-11-21', end: null, readFrom: 'body' }]);
  });

  it('with a start and no end, whose length is unknown, keeps its time for a person', () => {
    // The saved programme's period without its end.
    const page = programme('PGM012002414').replace(
      '2026.11.02. 10:00 ~ 2026.11.02. 11:00</td>',
      '2026.11.02. 10:00 ~</td>',
    );

    expect(parseExtraSnuPage(page, 'PGM012002414').sessions).toMatchObject([
      { start: '2026-11-02T10:00:00+09:00', end: null, readFrom: null },
    ]);
  });

  it('with an empty period and "-" as its place gives neither, and no line of the description', () => {
    const { sessions, description } = parsed('PGM012002143');

    expect(sessions).toEqual([{ number: 1, start: null, end: null, readFrom: null, place: null }]);
    expect(description).not.toContain('회차]');
  });
});

describe('A session the main server would refuse', () => {
  it('of a number that appears twice is refused, so that the programme alone is held back', () => {
    // The saved programme's second session under the number of its first.
    const twice = programme('PGM012002329').replace('[2]', '[1]');
    expect(() => parseExtraSnuPage(twice, 'PGM012002329')).toThrow('Session 1 appears twice');
  });

  it('of number 0 is refused', () => {
    // The saved programme's one session under the number 0.
    const zero = programme('PGM012002414').replace('[1]', '[0]');
    expect(() => parseExtraSnuPage(zero, 'PGM012002414')).toThrow('A session has no number');
  });
});

describe('An e-mail address anywhere on the page', () => {
  it('is masked in the place and the title too', () => {
    // The saved programme with an address in its place's field and its title.
    const page = programme('PGM012002414')
      .replace('<td class="last">중앙도서관 관정관 3층 양두석홀</td>', '<td class="last">문의 a.b@snu.ac.kr</td>')
      .replace('<p class="tit">IEEE Authorship Seminar</p>', '<p class="tit">문의 a.b@snu.ac.kr</p>');

    const { title, sessions } = parseExtraSnuPage(page, 'PGM012002414');

    expect(title).toBe('문의 [이메일]');
    expect(sessions[0].place).toBe('문의 [이메일]');
  });
});

describe('A page that is not the programme asked for', () => {
  it('another programme is refused', () => {
    expect(() => parseExtraSnuPage(programme('PGM012002414'), 'PGM012002329')).toThrow(
      'The page is not programme PGM012002329',
    );
  });

  it('a page without a programme is refused', () => {
    expect(() => parseExtraSnuPage('<html><body>대기 중</body></html>', 'PGM012002414')).toThrow(
      'The page has no programme',
    );
  });

  it('a programme without session tables is refused', () => {
    // No table holds a session once none has the name the parser looks for.
    const noSessions = programme('PGM012002414').replaceAll('intlNsbjtLtrInfoList', 'other');
    expect(() => parseExtraSnuPage(noSessions, 'PGM012002414')).toThrow('The programme has no sessions');
  });
});
