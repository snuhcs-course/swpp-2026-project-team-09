// AI-generated with Claude Opus 5.5, 2026-10-02 to 2026-10-04, prompted by TaeHyun79 and fyoon46, reviewed by fyoon46 in #26 #30 #31
import { z } from 'zod';

const payloadSchema = z.record(z.string(), z.unknown());

// Stands for the main server: keeps each request the worker sends, a message or a question, with the path it was sent
// to, and answers it.
export class MainServerStub {
  readonly messages: { path: string; data: Record<string, unknown> }[] = [];
  // The token of each message, as the worker sent it.
  readonly tokens: (string | null)[] = [];
  // The problem to answer a message to a path with, in place of taking it.
  readonly refusals = new Map<string, string>();
  // The answer to a question to a path, which the main server gives with 200.
  readonly answers = new Map<string, object>();
  // The paths whose messages get no answer, as from a main server that hangs.
  readonly unanswered = new Set<string>();
  // A main server that cannot be reached.
  down = false;

  // Give it to startApp in place of the HTTP call to the main server.
  readonly fetch: typeof fetch = (input, init) => {
    if (this.down) {
      return Promise.reject(new Error('connect ECONNREFUSED'));
    }
    const { pathname } = new URL(input instanceof Request ? input.url : String(input));
    if (init?.method !== 'POST') {
      return Promise.resolve(Response.json({ status: 'ok' }));
    }
    const body = typeof init.body === 'string' ? init.body : '';
    this.messages.push({ path: pathname, data: payloadSchema.parse(JSON.parse(body)) });
    this.tokens.push(new Headers(init.headers).get('Authorization'));
    if (this.unanswered.has(pathname)) {
      return new Promise((_, reject) => {
        // As fetch does, with the reason the request was aborted for.
        init.signal?.addEventListener('abort', () => {
          const reason: unknown = init.signal?.reason;
          reject(reason instanceof Error ? reason : new Error(String(reason)));
        });
      });
    }
    const problem = this.refusals.get(pathname);
    if (problem === undefined) {
      const answer = this.answers.get(pathname);
      return Promise.resolve(answer === undefined ? new Response(null, { status: 204 }) : Response.json(answer));
    }
    // As the main server refuses a message that does not match its schema.
    return Promise.resolve(
      Response.json({ statusCode: 400, message: [problem], error: 'Bad Request' }, { status: 400 }),
    );
  };

  // The messages sent to a path that name a Source.
  from(source: string, path = '/menus/collected'): Record<string, unknown>[] {
    return this.messages
      .filter((message) => message.path === path && message.data['source'] === source)
      .map(({ data }) => data);
  }
}
