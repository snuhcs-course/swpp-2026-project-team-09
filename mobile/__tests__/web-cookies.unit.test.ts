/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { clearWebViewCookies } from '@/library/web-cookies';

// The JS side of `modules/snu-now-web-cookies`, with the native module stood in for. The native side, which clears
// Android's CookieManager and iOS's WKWebsiteDataStore, is checked on phones (ticket 04's hand check).

let mockModule: Record<string, unknown> | null = null;

jest.mock('expo', () => ({
  requireOptionalNativeModule: (name: string): unknown => (name === 'SnuNowWebCookies' ? mockModule : null),
}));

afterEach(() => {
  mockModule = null;
});

describe("the web views' cookie jar", () => {
  it('asks the native module to clear every cookie', async () => {
    const clear = jest.fn((): Promise<void> => Promise.resolve());
    mockModule = { clearWebViewCookies: clear };

    await clearWebViewCookies();

    expect(clear).toHaveBeenCalledTimes(1);
  });

  it('does nothing in a build without the module (Expo Go, the web, the tests)', async () => {
    await expect(clearWebViewCookies()).resolves.toBeUndefined();
  });

  it('passes on a failure, for the logout step to go on past it', async () => {
    mockModule = { clearWebViewCookies: (): Promise<void> => Promise.reject(new Error('no jar')) };

    await expect(clearWebViewCookies()).rejects.toThrow('no jar');
  });
});
