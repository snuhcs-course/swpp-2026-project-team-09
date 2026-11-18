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

// The page's words and what it holds are `invite-page.unit.test.ts`'s; here, what reaches a browser.
function expectAPage(response: request.Response): void {
  expect(response.headers['content-type']).toBe('text/html; charset=utf-8');
  expect(response.headers['x-robots-tag']).toBe('noindex');
  expect(response.headers['content-security-policy']).toMatch(/^default-src 'none';/u);
  expect(response.text).toContain('<h1>SNU Now 친구 초대</h1>');
}

describe("The page at an Invite Link's address", () => {
  it('answers a well-formed token without a sign-in with one button that opens the app at the link', async () => {
    const token = randomBytes(32).toString('base64url');

    const response = await openPage(token);

    expect(response.status).toBe(200);
    expectAPage(response);
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
    ['malformed', 'k3J9xQ'],
    ['carrying markup', '"><script>alert(1)</script>'],
  ])(
    'answers a %s token with a page that says it is not found, with no button and nothing of the address',
    async (_, token) => {
      const response = await openPage(encodeURIComponent(token));

      expect(response.status).toBe(404);
      expectAPage(response);
      expect(response.text).toContain('찾을 수 없는 초대 링크예요');
      expect(response.text).not.toContain('SNU Now에서 열기');
      expect(response.text).not.toContain(token);
      expect(response.text).not.toContain(encodeURIComponent(token));
    },
  );
});

describe("Beside the page, the Invite Links' routes of the API", () => {
  it('still need a sign-in', async () => {
    const token = randomBytes(32).toString('base64url');

    expect((await request(app.getHttpServer()).get(`/invite-links/${token}`)).status).toBe(401);
    expect((await request(app.getHttpServer()).post(`/invite-links/${token}/accept`)).status).toBe(401);
    expect((await request(app.getHttpServer()).post('/invite-links')).status).toBe(401);
  });
});
