// AI-generated with Claude Opus 5.5, 2026-10-06, prompted by fyoon46, reviewed by TaeHyun79 in #48
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { Settings } from '../common/settings.js';
import { MainServerRefusal } from './main-server-refusal.js';

// Injection token of the HTTP call under MainServer. The tests replace it with a stand-in for the main server.
export const FETCH_MAIN_SERVER = 'FETCH_MAIN_SERVER';

// An answer not given by then is given up, so that a round never waits for a main server that is down.
const ANSWER_TIMEOUT_MS = 5000;

const refusalSchema = z.object({ code: z.string() });

// What went wrong with a call, for the log.
export function problemOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// This server's way to the main server: HTTP requests with MATCH_SERVER_TOKEN, each of which reaches one main server
// however many run (README.md: Rounds).
@Injectable()
export class MainServer {
  private readonly url: string;
  private readonly token: string;

  constructor(
    settings: ConfigService<Settings, true>,
    @Inject(FETCH_MAIN_SERVER) private readonly fetchMainServer: typeof fetch,
  ) {
    this.url = settings.get('MAIN_SERVER_URL', { infer: true });
    this.token = settings.get('MATCH_SERVER_TOKEN', { infer: true });
  }

  // Resolves with an answer in 2xx that matches `schema`. Rejects with MainServerRefusal for a refusal with a code, and
  // with an Error for any other answer or none within 5 seconds.
  async post<T>(path: string, body: object, schema: z.ZodType<T>): Promise<T> {
    let response: Response;
    let answer: unknown;
    try {
      response = await this.fetchMainServer(new URL(path, this.url), {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(ANSWER_TIMEOUT_MS),
      });
      answer = await response.json().catch(() => null);
    } catch (error) {
      throw new Error(`The main server did not answer ${path}: ${String(error)}`, { cause: error });
    }
    if (response.ok) {
      const parsed = schema.safeParse(answer);
      if (parsed.success) {
        return parsed.data;
      }
      throw new Error(`The main server's answer to ${path} is not the one asked for`);
    }
    const refusal = refusalSchema.safeParse(answer);
    if (response.status < 500 && refusal.success) {
      throw new MainServerRefusal(refusal.data.code);
    }
    throw new Error(`The main server did not take ${path}: it answered ${response.status}`);
  }
}
