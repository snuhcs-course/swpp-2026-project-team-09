/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { FakeLibrary, fakeTransport } from './support/kwanjeong/fake-library';
import { loginWorks } from '@/library/client';
import type { LibraryTransport, TransportReply } from '@/library/transport';

// The check that ends the login: one read through the transport, here the fake transport over the fake library.

let library: FakeLibrary;

beforeEach(() => {
  library = new FakeLibrary();
});

describe("the login's check", () => {
  it("works when the User's own bookings for today come back from the site", async () => {
    const transport = fakeTransport(library);

    await expect(loginWorks(transport, '20261102')).resolves.toBe(true);
    expect(library.requestsTo('getMyBookingList')).toEqual([
      { endpoint: 'getMyBookingList', body: { start: '20261102', end: '20261102' } },
    ]);
  });

  it.each(['sessionEnded', 'network'] as const)('does not work when the read answers %s', async (error) => {
    library.answerNext(error);

    await expect(loginWorks(fakeTransport(library), '20261102')).resolves.toBe(false);
  });

  it('does not work when the reply is not the bookings list', async () => {
    const transport: LibraryTransport = {
      ...fakeTransport(library),
      call: (): Promise<TransportReply> => Promise.resolve({ ok: true, result: 'html' }),
    };

    await expect(loginWorks(transport, '20261102')).resolves.toBe(false);
  });
});
