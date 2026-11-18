/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { HttpStatus } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { invitePage } from '../src/invite-links/invite-page.js';

// The page at an Invite Link's address, as `invitePage` writes it for each kind of token.

function links(html: string): string[] {
  return [...html.matchAll(/\shref="([^"]*)"/gu)].map(([, href]) => href);
}

function expectThePage(html: string): void {
  expect(html).toContain('<meta name="robots" content="noindex">');
  expect(html).toContain('<meta name="viewport" content="width=device-width, initial-scale=1">');
  expect(html).toContain('<title>SNU Now 친구 초대</title>');
  expect(html).toContain('<h1>SNU Now 친구 초대</h1>');
  expect(html).toContain('aria-label="SNU Now"');
  // Nothing from another host, no script that opens the app by itself, no APK.
  expect(html).not.toMatch(/\ssrc=|<script|<link|@import|url\(/u);
  expect(html).not.toMatch(/\.apk/iu);
}

describe("The page for a token of an Invite Link token's form", () => {
  it('has the words and one button that opens the app at the link', () => {
    const token = randomBytes(32).toString('base64url');

    const { status, html } = invitePage(token);

    expect(status).toBe(HttpStatus.OK);
    expectThePage(html);
    expect(links(html)).toEqual([`snunow://invite/${token}`]);
    expect(html).toContain(`<a href="snunow://invite/${token}">SNU Now에서 열기</a>`);
    expect(html).toContain('앱이 설치돼 있어야 열려요.');
    expect(html).not.toContain('찾을 수 없는 초대 링크예요');
  });

  it('takes every character of base64url', () => {
    const token = `${'Az09'.repeat(10)}_-a`;

    expect(invitePage(token).status).toBe(HttpStatus.OK);
  });
});

describe('The page for a token of any other form', () => {
  it.each([
    ['too short', 'k3J9xQ'],
    ['one character too long', 'a'.repeat(44)],
    ['with a character outside base64url', `${'a'.repeat(42)}.`],
    ['with a space', `${'a'.repeat(42)} `],
    ['carrying markup', '"><script>alert(1)</script>'],
    ["carrying markup of a token's length", `<img src=x onerror=alert(1)>${'a'.repeat(15)}`],
    ['closing the attribute', `${'a'.repeat(41)}">`],
  ])('is %s: says it is not found, with no button and nothing of the token', (_, token) => {
    const { status, html } = invitePage(token);

    expect(status).toBe(HttpStatus.NOT_FOUND);
    expectThePage(html);
    expect(html).toContain('찾을 수 없는 초대 링크예요');
    expect(links(html)).toEqual([]);
    expect(html).not.toContain('SNU Now에서 열기');
    expect(html).not.toContain(token);
    expect(html).not.toContain('alert');
  });
});
