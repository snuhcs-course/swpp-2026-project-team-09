/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { fallbackFor, readCardAddress } from '@/push/card-address';

describe("a push's address", () => {
  it.each([
    [
      '/main?card=invitation:3f2b8c1e-5d4a-4b6f-9e0d-7a1c2b3d4e5f',
      'invitation',
      '3f2b8c1e-5d4a-4b6f-9e0d-7a1c2b3d4e5f',
    ],
    ['/main?card=friend:6d1c3f5e-1111-4a5b-8c9d-000000000001', 'friend', '6d1c3f5e-1111-4a5b-8c9d-000000000001'],
    ['/main?card=place:37.4592,126.9524', 'place', '37.4592,126.9524'],
  ])('reads %s', (url, kind, id) => {
    expect(readCardAddress(url)).toEqual({ kind, id });
  });

  it.each([['/me'], ['https://example.com'], ['/main?card='], ['/main?card=friend'], [42], [null]])(
    'refuses %p',
    (url) => {
      expect(readCardAddress(url)).toBeNull();
    },
  );
});

describe('where a card not on the map falls back to', () => {
  it("opens the 파티 tab's invitations for an invitation", () => {
    expect(fallbackFor('invitation')).toEqual({ pathname: '/party', params: { tab: 'invites' } });
  });

  it('stays on the main map for any other kind', () => {
    expect(fallbackFor('shuttle-stop')).toEqual({ pathname: '/main' });
  });
});
