/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { CALL_MS, HiddenViewTransport, LOGOUT_MS, PAGE_LOAD_MS } from '@/library/hidden-transport';
import { isLibraryPage, isLoginDone, LIBRARY_LOGOUT_URL, LIBRARY_MAIN_URL, seatMapUrl } from '@/library/site';
import type { TransportReply } from '@/library/transport';

// The hidden web view's transport with a stand-in for the view: the id matching, the timeouts and the page's states.

const PAGE = 'https://k-rsv.snu.ac.kr/NEW_SNU_BOOKING/pc/main';

interface View {
  injected: string[];
  loads: string[];
}

function attached(transport: HiddenViewTransport): View {
  const view: View = { injected: [], loads: [] };
  transport.attach({
    inject: (script) => {
      view.injected.push(script);
    },
    load: (url) => {
      view.loads.push(url);
    },
  });
  return view;
}

// The id of the call injected last, read from its argument.
function lastId(view: View): string {
  const match = /"id":"([^"]+)"/u.exec(view.injected.at(-1) ?? '');
  if (match?.[1] === undefined) {
    throw new Error('Nothing was injected');
  }
  return match[1];
}

async function settled(promise: Promise<TransportReply>): Promise<TransportReply> {
  await jest.advanceTimersByTimeAsync(0);
  return promise;
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('a call through the hidden view', () => {
  it('waits for the page, then injects one script and takes the reply with its id', async () => {
    const transport = new HiddenViewTransport();
    const view = attached(transport);
    const call = transport.call('getSectorList', { libno: '1', floorno: '7' });
    await jest.advanceTimersByTimeAsync(0);
    expect(view.injected).toHaveLength(0);

    transport.loaded(PAGE);
    await jest.advanceTimersByTimeAsync(0);
    expect(view.injected).toHaveLength(1);
    const id = lastId(view);
    transport.received(JSON.stringify({ id: 'someone-else', ok: true, result: { wrong: true } }), PAGE);
    transport.received(JSON.stringify({ id, ok: true, result: { wrong: true } }), 'https://evil.example/pc/main');
    transport.received(JSON.stringify({ id, ok: true, result: { SectorList: [] } }), PAGE);

    await expect(settled(call)).resolves.toEqual({ ok: true, result: { SectorList: [] } });
  });

  it('gives network after 15 seconds without a reply, and sends the write only once', async () => {
    const transport = new HiddenViewTransport();
    const view = attached(transport);
    transport.loaded(PAGE);
    const call = transport.call('setRoomBooking', { seatNo: '17202001' });
    await jest.advanceTimersByTimeAsync(CALL_MS - 1);
    expect(view.injected).toHaveLength(1);

    await jest.advanceTimersByTimeAsync(1);

    await expect(call).resolves.toEqual({ ok: false, error: 'network' });
    await jest.advanceTimersByTimeAsync(CALL_MS * 4);
    expect(view.injected).toHaveLength(1);
  });
});

describe('a call whose page does not serve it', () => {
  it('gives network when the page does not load in 20 seconds, and loads it again for the next call', async () => {
    const transport = new HiddenViewTransport();
    const view = attached(transport);
    const first = transport.call('getMyBookingList', {});
    await jest.advanceTimersByTimeAsync(PAGE_LOAD_MS);
    await expect(first).resolves.toEqual({ ok: false, error: 'network' });

    void transport.call('getMyBookingList', {});
    await jest.advanceTimersByTimeAsync(0);

    expect(view.loads).toEqual([LIBRARY_MAIN_URL]);
  });

  it('gives sessionEnded when the page lands off the booking site, for the waiting call and the next', async () => {
    const transport = new HiddenViewTransport();
    const view = attached(transport);
    transport.loaded(PAGE);
    const waiting = transport.call('getMyBookingList', {});
    await jest.advanceTimersByTimeAsync(0);

    transport.loaded('https://nsso.snu.ac.kr/sso/login');

    await expect(settled(waiting)).resolves.toEqual({ ok: false, error: 'sessionEnded' });
    await expect(settled(transport.call('getSectorList', {}))).resolves.toEqual({ ok: false, error: 'sessionEnded' });
    expect(view.injected).toHaveLength(1);
  });
});

describe('a call the view ends', () => {
  it('passes the error kind the script posted', async () => {
    const transport = new HiddenViewTransport();
    const view = attached(transport);
    transport.loaded(PAGE);
    const call = transport.call('getMyBookingList', {});
    await jest.advanceTimersByTimeAsync(0);

    transport.received(JSON.stringify({ id: lastId(view), ok: false, error: 'sessionEnded' }), PAGE);

    await expect(settled(call)).resolves.toEqual({ ok: false, error: 'sessionEnded' });
  });

  it('ends every waiting call as sessionEnded when the view goes', async () => {
    const transport = new HiddenViewTransport();
    attached(transport);
    transport.loaded(PAGE);
    const call = transport.call('getMyBookingList', {});
    await jest.advanceTimersByTimeAsync(0);

    transport.detach();

    await expect(settled(call)).resolves.toEqual({ ok: false, error: 'sessionEnded' });
  });
});

describe('the logout in the hidden view', () => {
  it('loads the logout URL and ends when its page loaded', async () => {
    const transport = new HiddenViewTransport();
    const view = attached(transport);
    transport.loaded(PAGE);
    const logout = transport.logout();

    expect(view.loads).toEqual([LIBRARY_LOGOUT_URL]);
    transport.loaded('https://k-rsv.snu.ac.kr/NEW_SNU_BOOKING/pc/main');

    await expect(logout).resolves.toBe(true);
  });

  it('gives up after 15 seconds', async () => {
    const transport = new HiddenViewTransport();
    attached(transport);
    const logout = transport.logout();

    await jest.advanceTimersByTimeAsync(LOGOUT_MS);

    await expect(logout).resolves.toBe(false);
  });

  it('loads the logout URL as soon as the view is mounted', async () => {
    const transport = new HiddenViewTransport();
    const logout = transport.logout();
    const view = attached(transport);

    expect(view.loads).toEqual([LIBRARY_LOGOUT_URL]);
    transport.loadFailed();

    await expect(logout).resolves.toBe(false);
  });
});

describe("the site's addresses", () => {
  it.each([
    ['https://k-rsv.snu.ac.kr/NEW_SNU_BOOKING/pc/main', true],
    ['https://k-rsv.snu.ac.kr/NEW_SNU_BOOKING/pc/booking/roomForm', true],
    ['https://k-rsv.snu.ac.kr/NEW_SNU_BOOKING/pc/mybooking', true],
    ['https://k-rsv.snu.ac.kr/NEW_SNU_BOOKING/pc/login', false],
    ['https://nsso.snu.ac.kr/sso/login?pc/main', false],
    ['https://k-rsv.snu.ac.kr.evil.example/NEW_SNU_BOOKING/pc/main', false],
    ['http://k-rsv.snu.ac.kr/NEW_SNU_BOOKING/pc/main', false],
  ])('counts %s as a finished login: %s', (url, done) => {
    expect(isLoginDone(url)).toBe(done);
  });

  it('keeps the hidden view on the booking screens only', () => {
    expect(isLibraryPage('https://k-rsv.snu.ac.kr/NEW_SNU_BOOKING/pc/login')).toBe(true);
    expect(isLibraryPage('https://k-rsv.snu.ac.kr/NEW_SNU_BOOKING/logout')).toBe(false);
    expect(isLibraryPage('https://nsso.snu.ac.kr/NEW_SNU_BOOKING/pc/main')).toBe(false);
  });

  it("builds a sector's seat map address", () => {
    expect(seatMapUrl(17202)).toBe('https://k-rsv.snu.ac.kr:444/MAP/WEB/area_17202.png?version=20261022');
  });
});
