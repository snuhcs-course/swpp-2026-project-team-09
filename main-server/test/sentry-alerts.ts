/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { Server } from 'node:http';
import request from 'supertest';

// Placeholders only: no real secret or webhook is in a test.
export const SENTRY_SECRET = 'test-sentry-client-secret-0123456789abcdef';
export const SLACK_WEBHOOK = 'https://hooks.slack.invalid/T/B/x';
export const crashAlertSettings = { SENTRY_WEBHOOK_SECRET: SENTRY_SECRET, APP_CRASH_SLACK_WEBHOOK: SLACK_WEBHOOK };

// Answers in Slack's place when a test gave no answer, so that no test reaches Slack.
export function refuseSlack(): Promise<Response> {
  return Promise.reject(new Error('The test gave Slack no answer'));
}

// An issue alert as Sentry's documents show it (Integration Platform › Webhooks › Issue Alerts), with this app's tags.
export function issueAlert(event: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    action: 'triggered',
    installation: { uuid: 'a8e5d37a-696c-4c54-adb5-b3f28d64c7de' },
    data: {
      event: {
        title: "TypeError: Cannot read property 'x' of undefined",
        culprit: 'app/(tabs)/index.tsx',
        level: 'error',
        tags: [
          ['handled', 'no'],
          ['release_tag', 'snunow/all/26.11.24-1'],
          ['platform', 'android'],
          ['user', 'id:3f2c1b7e'],
        ],
        user: { id: '3f2c1b7e' },
        exception: { values: [{ stacktrace: { frames: [{ filename: 'secret-stack-frame.tsx' }] } }] },
        breadcrumbs: { values: [{ message: 'a breadcrumb of the screens' }] },
        request: { url: 'https://api.snunow.invalid/users/me?token=abc' },
        web_url: 'https://sentry.io/organizations/test-org/issues/1117540176/events/e4874d664c3540c1a32eab185f12c5ab/',
        issue_url: 'https://sentry.io/api/0/issues/1117540176/',
        ...event,
      },
      triggered_rule: 'A new crash',
    },
    actor: { type: 'application', id: 'sentry', name: 'Sentry' },
  };
}

export function sign(body: string, secret = SENTRY_SECRET): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}

// Sends `body` as Sentry does: its bytes as they are, signed unless `signature` says otherwise.
export function postAlert(
  app: INestApplication<Server>,
  body: string,
  { signature = sign(body), resource = 'event_alert' }: { signature?: string | null; resource?: string } = {},
): request.Test {
  const call = request(app.getHttpServer())
    .post('/sentry/alerts')
    .set('Content-Type', 'application/json')
    .set('Sentry-Hook-Resource', resource)
    .set('Sentry-Hook-Timestamp', '1700000000')
    .set('Request-ID', 'b0f2d83c-2a7a-4c1e-9f0a-7d1c2e3f4a5b');
  return (signature === null ? call : call.set('Sentry-Hook-Signature', signature)).send(body);
}

// Stands for Slack's Incoming Webhook: keeps each post's URL and text, and answers as it was last told.
export class SlackStub {
  posts: { url: string; text: unknown; timeout: boolean }[] = [];
  private respond: (signal?: AbortSignal | null) => Promise<Response> = () => Promise.resolve(new Response('ok'));

  reset(): void {
    this.posts = [];
    this.respond = (): Promise<Response> => Promise.resolve(new Response('ok'));
  }

  answers(status: number, body = 'no_service'): void {
    this.respond = (): Promise<Response> => Promise.resolve(new Response(body, { status }));
  }

  fails(error: Error): void {
    this.respond = (): Promise<Response> => Promise.reject(error);
  }

  readonly fetch = (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const body: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : null;
    const text = typeof body === 'object' && body !== null && 'text' in body ? body.text : undefined;
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    this.posts.push({ url, text, timeout: init?.signal instanceof AbortSignal });
    return this.respond(init?.signal);
  };
}

// Lets a post that was wrongly started reach the stand-in before a test checks that none did.
export async function settle(): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 50);
  });
}
