/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-01  Opus 5.5   prompted by TaeHyun79
 * 2026-10-02  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

export interface Sources {
  // Give it to startApp in place of fetch.
  fetch: typeof fetch;
  // Each request the worker made, in order.
  requests: {
    url: string;
    method: string;
    userAgent: string | null;
    contentType: string | null;
    body: string | null;
  }[];
  // The most requests that were open at one moment.
  mostAtOnce: number;
}

// Stands for the Sources: answers the address of each page with the page, or with the status given in its place, and
// any other address with 404. An address given `null` never answers; its request ends only when the worker aborts it.
export function sourcesServing(pages: Record<string, string | number | null>): Sources {
  let open = 0;
  const sources: Sources = {
    requests: [],
    mostAtOnce: 0,
    fetch: async (input, init) => {
      const url = input instanceof Request ? input.url : String(input);
      const headers = new Headers(init?.headers);
      sources.requests.push({
        url,
        method: init?.method ?? 'GET',
        userAgent: headers.get('User-Agent'),
        contentType: headers.get('Content-Type'),
        body: typeof init?.body === 'string' ? init.body : null,
      });
      if (pages[url] === null) {
        return new Promise((_, reject) => {
          // As fetch does, with the reason the request was aborted for.
          init?.signal?.addEventListener('abort', () => {
            const reason: unknown = init.signal?.reason;
            reject(reason instanceof Error ? reason : new Error(String(reason)));
          });
        });
      }
      open += 1;
      sources.mostAtOnce = Math.max(sources.mostAtOnce, open);
      // Long enough for another request to arrive while this one is open. The global timer, which a test can replace.
      await new Promise((resolve) => {
        setTimeout(resolve, 5);
      });
      open -= 1;
      const page = pages[url] ?? 404;
      return typeof page === 'number' ? new Response(null, { status: page }) : new Response(page);
    },
  };
  return sources;
}
