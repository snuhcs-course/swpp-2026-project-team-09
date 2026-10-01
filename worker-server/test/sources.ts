import { setTimeout } from 'node:timers/promises';

export interface Sources {
  // Give it to startApp in place of fetch.
  fetch: typeof fetch;
  // Each request the worker made, in order.
  requests: { url: string; userAgent: string | null }[];
  // The most requests that were open at one moment.
  mostAtOnce: number;
}

// Stands for the Sources: answers the address of each page with the page, or with the status given in its place, and
// any other address with 404.
export function sourcesServing(pages: Record<string, string | number>): Sources {
  let open = 0;
  const sources: Sources = {
    requests: [],
    mostAtOnce: 0,
    fetch: async (input, init) => {
      const url = input instanceof Request ? input.url : String(input);
      sources.requests.push({ url, userAgent: new Headers(init?.headers).get('User-Agent') });
      open += 1;
      sources.mostAtOnce = Math.max(sources.mostAtOnce, open);
      // Long enough for another request to arrive while this one is open.
      await setTimeout(5);
      open -= 1;
      const page = pages[url] ?? 404;
      return typeof page === 'number' ? new Response(null, { status: page }) : new Response(page);
    },
  };
  return sources;
}
