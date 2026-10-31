/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import {
  collect,
  collected,
  list,
  listPages,
  mainServerNotStoring,
  programme,
  programmePage,
  seminar,
} from './extra-snu.js';

const NOT_A_PROGRAMME = programmePage('<html><body><p>존재하지 않는 프로그램입니다.</p></body></html>');

describe('A Collection of extra.snu that cannot open a page', () => {
  it('hands over what it read with the reason when a programme does not answer, and opens no more', async () => {
    const { browser, mainServer, succeeded } = await collect(
      // The saved programme as the page of the first new one, whose own page is not saved.
      {
        ...listPages,
        [programme('PGM012002407')]: programmePage(String(seminar.html).replaceAll('2002414', '2002407')),
      },
      mainServerNotStoring('PGM012002407', 'PGM012002417', 'PGM012002416'),
    );

    expect(succeeded).toBe(false);
    expect(browser.opened.map(({ url }) => url).slice(4)).toEqual([
      programme('PGM012002407'),
      programme('PGM012002417'),
    ]);
    expect(collected(mainServer)).toMatchObject({
      failureReason: `${programme('PGM012002417')} did not answer`,
      posts: [{ key: 'PGM012002407' }],
    });
    expect(browser.closes).toBe(1);
  });

  it("stops at the university's firewall", async () => {
    const { mainServer, succeeded } = await collect(
      { ...listPages, [programme('PGM012002407')]: { redirectedTo: 'https://snucert.snu.ac.kr/waf/error.html' } },
      mainServerNotStoring('PGM012002407'),
    );

    expect(succeeded).toBe(false);
    expect(collected(mainServer)).toMatchObject({
      failureReason: `The university's firewall blocked ${programme('PGM012002407')}`,
      posts: [],
    });
  });
});

describe('A Collection of extra.snu held in the waiting room', () => {
  it('stops with the reason, and does not store the programme, so that the next Collection reads it', async () => {
    const waiting = 'https://extra.snu.ac.kr/wait.jsp';
    const { mainServer, succeeded } = await collect(
      { ...listPages, [programme('PGM012002407')]: { redirectedTo: waiting } },
      mainServerNotStoring('PGM012002407'),
    );

    expect(succeeded).toBe(false);
    expect(collected(mainServer)).toMatchObject({
      failureReason: `${programme('PGM012002407')} stopped at ${waiting}`,
      posts: [],
    });
  });
});

describe('A Collection of extra.snu that reads nothing', () => {
  it('records a failure when the list cannot be read', async () => {
    const { mainServer, succeeded } = await collect({}, mainServerNotStoring());

    expect(succeeded).toBe(false);
    expect(mainServer.from('extra_snu', '/collections/failed')).toMatchObject([
      { source: 'extra_snu', reason: `${list(1)} did not answer` },
    ]);
  });

  it('records a failure when the browser does not start', async () => {
    const { mainServer, succeeded } = await collect({}, mainServerNotStoring(), () =>
      Promise.reject(new Error('No browser in this image')),
    );

    expect(succeeded).toBe(false);
    expect(mainServer.from('extra_snu', '/collections/failed')).toMatchObject([{ reason: 'No browser in this image' }]);
  });
});

describe('A Collection of extra.snu that opens a page that is not the programme', () => {
  it('sends the programme as it is listed, for a Draft, once one after it is read', async () => {
    const { mainServer, succeeded } = await collect(
      { ...listPages, [programme('PGM012002407')]: NOT_A_PROGRAMME, [programme('PGM012002414')]: seminar },
      mainServerNotStoring('PGM012002407', 'PGM012002414'),
    );

    expect(succeeded).toBe(true);
    expect(collected(mainServer)).toMatchObject({
      failureReason: null,
      posts: [
        {
          key: 'PGM012002407',
          description: '',
          sessions: [{ number: 1, start: null, end: null, readFrom: null, place: null }],
        },
        { key: 'PGM012002414' },
      ],
    });
  });

  it('fails at three in a row, sending none of them', async () => {
    const keys = ['PGM012002407', 'PGM012002417', 'PGM012002416', 'PGM012002414'];
    const { browser, mainServer, succeeded } = await collect(
      { ...listPages, ...Object.fromEntries(keys.map((key) => [programme(key), NOT_A_PROGRAMME])) },
      mainServerNotStoring(...keys),
    );

    expect(succeeded).toBe(false);
    expect(browser.opened).toHaveLength(7);
    expect(collected(mainServer)).toMatchObject({
      failureReason: '3 programmes in a row could not be read: The page has no programme',
      posts: [],
    });
  });

  it('fails when it read no other', async () => {
    const { mainServer, succeeded } = await collect(
      { ...listPages, [programme('PGM012002407')]: NOT_A_PROGRAMME },
      mainServerNotStoring('PGM012002407'),
    );

    expect(succeeded).toBe(false);
    expect(collected(mainServer)).toMatchObject({
      failureReason: 'No programme could be read: The page has no programme',
      posts: [],
    });
  });
});
