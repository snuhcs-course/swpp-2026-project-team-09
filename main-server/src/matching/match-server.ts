import { BadGatewayException, HttpException, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { Settings } from '../common/settings.js';

// Injection token of the HTTP call under MatchServer. The tests replace it with a stand-in for the match server.
export const FETCH_MATCH_SERVER = 'FETCH_MATCH_SERVER';

// Without a limit of its own, fetch waits 300 seconds for an answer, and so does the User.
const ANSWER_TIMEOUT_MS = 5000;

// A refusal the match server names with a code, such as a second request while one waits, which the app is to see.
const refusalSchema = z.object({ statusCode: z.number(), error: z.string(), code: z.string(), message: z.string() });

type Answer = { ok: true; status: number; body: unknown } | { ok: false; failure: string };

// This server's way to the match server: HTTP requests, each of which reaches one match server however many run
// (README.md: Matching).
@Injectable()
export class MatchServer {
  private readonly logger = new Logger(MatchServer.name);
  private readonly url: string;
  private readonly token: string;

  constructor(
    settings: ConfigService<Settings, true>,
    @Inject(FETCH_MATCH_SERVER) private readonly fetchMatchServer: typeof fetch,
  ) {
    this.url = settings.get('MATCH_SERVER_URL', { infer: true });
    this.token = settings.get('MATCH_SERVER_TOKEN', { infer: true });
  }

  // Resolves with the match server's answer, `null` for one without a body. A refusal with a code is passed on to the
  // app as it is. Any other answer, or none within 5 seconds, is logged and answered 502.
  async call<T>(method: 'GET' | 'POST', path: string, schema: z.ZodType<T>, body?: object): Promise<T> {
    const answer = await this.fetchAnswer(method, path, body);
    let failure: string;
    if (!answer.ok) {
      failure = answer.failure;
    } else if (answer.status >= 200 && answer.status < 300) {
      const parsed = schema.safeParse(answer.body);
      if (parsed.success) {
        return parsed.data;
      }
      failure = `HTTP ${answer.status} with an answer of another shape`;
    } else {
      const refusal = refusalSchema.safeParse(answer.body);
      if (refusal.success) {
        throw new HttpException(refusal.data, answer.status);
      }
      failure = `HTTP ${answer.status}`;
    }
    this.logger.warn(`The match server did not answer ${method} ${path}: ${failure}`);
    throw new BadGatewayException('The match server did not answer.');
  }

  private async fetchAnswer(method: string, path: string, body?: object): Promise<Answer> {
    try {
      const response = await this.fetchMatchServer(new URL(path, this.url), {
        method,
        headers: {
          Authorization: `Bearer ${this.token}`,
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        body: body === undefined ? null : JSON.stringify(body),
        signal: AbortSignal.timeout(ANSWER_TIMEOUT_MS),
      });
      const text = await response.text();
      return { ok: true, status: response.status, body: text === '' ? null : (JSON.parse(text) as unknown) };
    } catch (error) {
      return { ok: false, failure: String(error) };
    }
  }
}
