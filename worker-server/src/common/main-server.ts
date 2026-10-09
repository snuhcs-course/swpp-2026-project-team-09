// AI-generated with Claude Opus 5.5, 2026-10-04, prompted by fyoon46 and TaeHyun79, reviewed by fyoon46 in #30 #31
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { Settings } from './settings.js';

// Injection token of the HTTP call under MainServer. The tests replace it with a stand-in for the main server.
export const FETCH_MAIN_SERVER = 'FETCH_MAIN_SERVER';

// An answer not given by then is given up, so that a Collection never waits for a main server that is down.
const ANSWER_TIMEOUT = 5000;

// A refusal names its problem, or the problems of a message that does not match its schema.
const refusalSchema = z.object({ message: z.string().or(z.array(z.string())) });

async function problemOf(response: Response): Promise<string> {
  const refusal = refusalSchema.safeParse(await response.json().catch(() => null));
  if (!refusal.success) {
    return `answered ${response.status}`;
  }
  const { message } = refusal.data;
  return typeof message === 'string' ? message : message.join('; ');
}

// The worker's way to the main server: HTTP requests, each of which reaches one main server however many run (the
// main server's README: Requests from the worker server).
@Injectable()
export class MainServer {
  private readonly url: string;
  private readonly token: string;

  constructor(
    settings: ConfigService<Settings, true>,
    @Inject(FETCH_MAIN_SERVER) private readonly fetchMainServer: typeof fetch,
  ) {
    this.url = settings.get('MAIN_SERVER_URL', { infer: true });
    this.token = settings.get('WORKER_TOKEN', { infer: true });
  }

  // Sends a message with the worker's token and resolves when the main server took it. Rejects with the problem its
  // answer names, or when it does not answer.
  async send(path: string, message: object): Promise<void> {
    await this.post(path, message);
  }

  // Rejects as send() does, and when the answer does not match `schema`.
  async ask<T>(path: string, question: object, schema: z.ZodType<T>): Promise<T> {
    const response = await this.post(path, question);
    try {
      return schema.parse(await response.json());
    } catch {
      throw new Error(`The main server's answer to ${path} is not the one asked for`);
    }
  }

  async isLive(): Promise<boolean> {
    try {
      const response = await this.request('/health/live', {});
      return response.ok;
    } catch {
      return false;
    }
  }

  private async post(path: string, body: object): Promise<Response> {
    let response: Response;
    try {
      response = await this.request(path, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (error) {
      const problem = error instanceof Error ? error.message : String(error);
      throw new Error(`The main server did not take ${path}: ${problem}`, { cause: error });
    }
    if (!response.ok) {
      throw new Error(`The main server did not take ${path}: ${await problemOf(response)}`);
    }
    return response;
  }

  private async request(path: string, init: RequestInit): Promise<Response> {
    const timeout = new AbortController();
    const timer = setTimeout(() => {
      timeout.abort(new Error(`no answer within ${ANSWER_TIMEOUT / 1000} seconds`));
    }, ANSWER_TIMEOUT);
    try {
      return await this.fetchMainServer(new URL(path, this.url), { ...init, signal: timeout.signal });
    } finally {
      clearTimeout(timer);
    }
  }
}
