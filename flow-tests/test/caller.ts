// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import { createSign, randomUUID } from 'node:crypto';
import { inject } from 'vitest';
import { z } from 'zod';

export interface Answer {
  status: number;
  body: unknown;
}

const base64url = (value: object): string => Buffer.from(JSON.stringify(value)).toString('base64url');

// An ID token as Google would issue it, signed with the key that the sources container serves as Google's.
export function googleIdToken(claims: Record<string, unknown>): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: 'https://accounts.google.com', email_verified: true, iat: now, exp: now + 3600, ...claims };
  const unsigned = `${base64url({ alg: 'RS256', typ: 'JWT', kid: 'flow-tests' })}.${base64url(payload)}`;
  const signature = createSign('RSA-SHA256').update(unsigned).sign(inject('googlePrivateKey'), 'base64url');
  return `${unsigned}.${signature}`;
}

// Someone calling the main server, as the app or the admin site does. A call that has to succeed and does not names
// the caller, the call and the server's answer. A schema from answers.ts reads the answer.
export class Caller {
  constructor(
    readonly name: string,
    private readonly accessToken?: string,
  ) {}

  async call(method: string, path: string, body?: object, headers: Record<string, string> = {}): Promise<Answer> {
    const response = await fetch(`${inject('mainServer')}${path}`, {
      method,
      headers: {
        ...(this.accessToken === undefined ? {} : { Authorization: `Bearer ${this.accessToken}` }),
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    return { status: response.status, body: text === '' ? undefined : z.json().parse(JSON.parse(text)) };
  }

  get<T>(path: string, schema: z.ZodType<T>): Promise<T> {
    return this.succeeds('GET', path, schema);
  }

  post(path: string, body?: object): Promise<unknown>;
  post<T>(path: string, body: object | undefined, schema: z.ZodType<T>): Promise<T>;
  post(path: string, body?: object, schema: z.ZodType = z.unknown()): Promise<unknown> {
    return this.succeeds('POST', path, schema, body);
  }

  // A route that requires an Idempotency-Key.
  create<T>(path: string, body: object, schema: z.ZodType<T>): Promise<T> {
    return this.succeeds('POST', path, schema, body, { 'Idempotency-Key': randomUUID() });
  }

  put(path: string, body: object): Promise<unknown> {
    return this.succeeds('PUT', path, z.unknown(), body);
  }

  delete(path: string): Promise<unknown> {
    return this.succeeds('DELETE', path, z.unknown());
  }

  private async succeeds<T>(
    method: string,
    path: string,
    schema: z.ZodType<T>,
    body?: object,
    headers?: Record<string, string>,
  ): Promise<T> {
    const answer = await this.call(method, path, body, headers);
    if (answer.status >= 300) {
      throw new Error(`${this.name}: ${method} ${path} answered ${answer.status} ${JSON.stringify(answer.body)}`);
    }
    const read = schema.safeParse(answer.body);
    if (!read.success) {
      throw new Error(`${this.name}: ${method} ${path} answered ${JSON.stringify(answer.body)}, ${read.error.message}`);
    }
    return read.data;
  }
}
