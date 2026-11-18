/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { connect } from './containers.js';
import { signInUser } from './friends.js';
import { acceptInviteLink, createInviteLink, setInviteLinkExpiry } from './invite-links.js';
import { startApp } from './start-app.js';

const settings = inject('settings');
let app: INestApplication<Server>;
const prisma = connect(settings.DATABASE_URL);

beforeAll(async () => {
  app = await startApp(settings);
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

function openPage(path: string): request.Test {
  return request(app.getHttpServer()).get(`/invite/${path}`);
}

function links(html: string): string[] {
  return [...html.matchAll(/\shref="([^"]*)"/gu)].map(([, href]) => href);
}

function expectAPage(response: request.Response): void {
  expect(response.headers['content-type']).toBe('text/html; charset=utf-8');
  expect(response.headers['x-robots-tag']).toBe('noindex');
  expect(response.headers['content-security-policy']).toMatch(/^default-src 'none';/u);
  expect(response.text).toContain('<meta name="robots" content="noindex">');
  expect(response.text).toContain('<meta name="viewport" content="width=device-width, initial-scale=1">');
  expect(response.text).toContain('<title>SNU Now 친구 초대</title>');
  expect(response.text).toContain('<h1>SNU Now 친구 초대</h1>');
  expect(response.text).toContain('aria-label="SNU Now"');
  // Nothing from another host, no script that opens the app by itself, no APK.
  expect(response.text).not.toMatch(/\ssrc=|<script|<link|@import|url\(/u);
  expect(response.text).not.toMatch(/\.apk/iu);
}

describe("The page at an Invite Link's address", () => {
  it('answers a well-formed token without a sign-in with one button that opens the app at the link', async () => {
    const token = randomBytes(32).toString('base64url');

    const response = await openPage(token);

    expect(response.status).toBe(200);
    expectAPage(response);
    expect(links(response.text)).toEqual([`snunow://invite/${token}`]);
    expect(response.text).toContain(`<a href="snunow://invite/${token}">SNU Now에서 열기</a>`);
    expect(response.text).toContain('앱이 설치돼 있어야 열려요.');
  });

  it('is the same for a token nobody made, a used one and an expired one, and names no sender', async () => {
    const sender = await signInUser(app, { name: '홍길동', department: '컴퓨터공학부' });
    const [used, expired, usable] = [
      await createInviteLink(app, sender),
      await createInviteLink(app, sender),
      await createInviteLink(app, sender),
    ];
    expect((await acceptInviteLink(app, await signInUser(app), used)).status).toBe(204);
    await setInviteLinkExpiry(prisma, expired, new Date(Date.now() - 1000));
    const nobodys = randomBytes(32).toString('base64url');

    const pages = await Promise.all(
      [usable, used, expired, nobodys].map(async (token) => {
        const response = await openPage(token);
        expect(response.status).toBe(200);
        return response.text.replaceAll(token, '<token>');
      }),
    );

    expect(new Set(pages).size).toBe(1);
    expect(pages[0]).not.toContain('홍길동');
    expect(pages[0]).not.toContain('컴퓨터공학부');
  });
});

describe('The page at an address whose token has another form', () => {
  it.each([
    ['too short', 'k3J9xQ'],
    ['one character too long', 'a'.repeat(44)],
    ['with a character outside base64url', `${'a'.repeat(42)}.`],
    ['carrying markup', '"><script>alert(1)</script>'],
    ["carrying markup of a token's length", `<img src=x onerror=alert(1)>${'a'.repeat(15)}`],
  ])(
    'answers a token %s with a page that says it is not found, with no button and nothing of the address',
    async (_, token) => {
      const response = await openPage(encodeURIComponent(token));

      expect(response.status).toBe(404);
      expectAPage(response);
      expect(response.text).toContain('찾을 수 없는 초대 링크예요');
      expect(links(response.text)).toEqual([]);
      expect(response.text).not.toContain('SNU Now에서 열기');
      expect(response.text).not.toContain(token);
      expect(response.text).not.toContain(encodeURIComponent(token));
      expect(response.text).not.toContain('alert');
    },
  );
});

describe("Beside the page, the Invite Links' other addresses", () => {
  it('are as they were: the routes of the API need a sign-in, and the Digital Asset Links file answers', async () => {
    const token = randomBytes(32).toString('base64url');

    expect((await request(app.getHttpServer()).get(`/invite-links/${token}`)).status).toBe(401);
    expect((await request(app.getHttpServer()).post(`/invite-links/${token}/accept`)).status).toBe(401);
    expect((await request(app.getHttpServer()).post('/invite-links')).status).toBe(401);
    const assetLinks = await request(app.getHttpServer()).get('/.well-known/assetlinks.json');
    expect(assetLinks.status).toBe(200);
    expect(assetLinks.headers['content-type']).toMatch(/^application\/json/u);
  });
});
