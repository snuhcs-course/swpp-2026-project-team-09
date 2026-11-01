/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

// The provider's responses as they came, before its library's schema drops what it does not know. The benchmark gives
// the model this fetch, and each response is read once more and goes on to the library whole. It holds only the latest
// response, so it is right only while the benchmark's model calls run one at a time.
export class RawResponses {
  private latest: string | null = null;

  constructor(private readonly send: typeof globalThis.fetch = globalThis.fetch) {}

  readonly fetch: typeof globalThis.fetch = async (input, init) => {
    const response = await this.send(input, init);
    this.latest = await response.clone().text();
    return response;
  };

  // The response of the call that just ended, if it came through here: its JSON read back, or its text if it is none.
  take(): unknown {
    const { latest } = this;
    this.latest = null;
    if (latest === null) {
      return null;
    }
    try {
      return JSON.parse(latest) as unknown;
    } catch {
      return latest;
    }
  }
}
