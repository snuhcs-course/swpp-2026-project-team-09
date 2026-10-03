import { NEVER, Observable, of, throwError } from 'rxjs';
import { z } from 'zod';

const payloadSchema = z.record(z.string(), z.unknown());

// Stands for the main server in place of the messaging client: keeps each message the worker sends and answers it.
export class MainServerStub {
  readonly messages: { pattern: string; data: Record<string, unknown> }[] = [];
  // The problem to answer a message of a pattern with, in place of taking it.
  readonly refusals = new Map<string, string>();
  // The patterns whose messages get no answer, as from a main server that is down.
  readonly unanswered = new Set<string>();

  send(pattern: string, data: unknown): Observable<unknown> {
    // As JSON, which is how a message travels.
    this.messages.push({ pattern, data: payloadSchema.parse(JSON.parse(JSON.stringify(data))) });
    if (this.unanswered.has(pattern)) {
      return NEVER;
    }
    const problem = this.refusals.get(pattern);
    return problem === undefined ? of({ status: 'ok' }) : throwError(() => ({ status: 'error', message: problem }));
  }

  // The messages of a pattern that name a Source.
  from(source: string, pattern = 'menus-collected'): Record<string, unknown>[] {
    return this.messages
      .filter((message) => message.pattern === pattern && message.data['source'] === source)
      .map(({ data }) => data);
  }
}
