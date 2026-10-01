import { setTimeout } from 'node:timers/promises';

export interface Sites {
  // Give it to startApp in place of fetch.
  fetch: typeof fetch;
  // Each request the worker made, in order.
  requests: { url: string; userAgent: string | null }[];
  // The most requests that were open at one moment.
  mostAtOnce: number;
}

// Stands for the sites: answers the address of each page with the page, or with the status given in its place, and any
// other address with 404.
export function sitesServing(pages: Record<string, string | number>): Sites {
  let open = 0;
  const sites: Sites = {
    requests: [],
    mostAtOnce: 0,
    fetch: async (input, init) => {
      const url = input instanceof Request ? input.url : String(input);
      sites.requests.push({ url, userAgent: new Headers(init?.headers).get('User-Agent') });
      open += 1;
      sites.mostAtOnce = Math.max(sites.mostAtOnce, open);
      // Long enough for another request to arrive while this one is open.
      await setTimeout(5);
      open -= 1;
      const page = pages[url] ?? 404;
      return typeof page === 'number' ? new Response(null, { status: page }) : new Response(page);
    },
  };
  return sites;
}
