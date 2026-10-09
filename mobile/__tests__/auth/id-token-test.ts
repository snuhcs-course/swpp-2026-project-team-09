// AI-generated with Claude Opus 5.5, 2026-10-05, prompted by AhnJinYoung
import { idTokenOf } from '../support/id-token';
import { isSnuAccount, readIdToken } from '@/auth/id-token';

// Tokens written by hand, outside the app: a header, the claims and a signature that nobody checks.
const HEADER = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9';
// {"email":"gildong@snu.ac.kr","hd":"snu.ac.kr","name":"홍길동"}: holds "-", and its padding is left out.
const KOREAN_NAME = `${HEADER}.eyJlbWFpbCI6ImdpbGRvbmdAc251LmFjLmtyIiwiaGQiOiJzbnUuYWMua3IiLCJuYW1lIjoi7ZmN6ri464-ZIn0.c2lnbmF0dXJl`;
// {"email":"gildong@snu.ac.kr","hd":"snu.ac.kr","name":"홍길동 ??>"}: holds "-" and "_".
const BOTH_CHARACTERS = `${HEADER}.eyJlbWFpbCI6ImdpbGRvbmdAc251LmFjLmtyIiwiaGQiOiJzbnUuYWMua3IiLCJuYW1lIjoi7ZmN6ri464-ZID8_PiJ9.c2lnbmF0dXJl`;
// {"email":"someone@gmail.com","name":"Some One"}: a Gmail account has no "hd".
const GMAIL = `${HEADER}.eyJlbWFpbCI6InNvbWVvbmVAZ21haWwuY29tIiwibmFtZSI6IlNvbWUgT25lIn0.c2lnbmF0dXJl`;

describe("reading an ID token's claims", () => {
  it('reads the email, the hosted domain and a Korean name', () => {
    expect(readIdToken(KOREAN_NAME)).toEqual({ email: 'gildong@snu.ac.kr', hostedDomain: 'snu.ac.kr', name: '홍길동' });
  });

  it('reads the base64url characters "-" and "_"', () => {
    expect(readIdToken(BOTH_CHARACTERS).name).toBe('홍길동 ??>');
  });

  it('reads a token with its padding written out, too', () => {
    const [header, claims, signature] = KOREAN_NAME.split('.');

    expect(readIdToken(`${header}.${claims}=.${signature}`).name).toBe('홍길동');
  });

  it('gives null for a claim that is missing or is not text', () => {
    expect(readIdToken(GMAIL)).toEqual({ email: 'someone@gmail.com', hostedDomain: null, name: 'Some One' });
    expect(readIdToken(idTokenOf({ email: 7, hd: ['snu.ac.kr'], name: null }))).toEqual({
      email: null,
      hostedDomain: null,
      name: null,
    });
  });

  it('reads every length of claims, whatever padding it would need', () => {
    for (const name of ['가', '가a', '가ab', '가abc']) {
      expect(readIdToken(idTokenOf({ hd: 'snu.ac.kr', name })).name).toBe(name);
    }
  });

  it.each([
    ['no parts', 'not-a-token'],
    ['two parts', `${HEADER}.e30`],
    ['four parts', `${HEADER}.e30.c2ln.c2ln`],
    ['empty claims', `${HEADER}..c2lnbmF0dXJl`],
    ['a character outside base64url', `${HEADER}.e30*.c2lnbmF0dXJl`],
    ['an impossible length', `${HEADER}.e30Aa.c2lnbmF0dXJl`],
    ['claims that are not JSON', `${HEADER}.bm90IGpzb24.c2lnbmF0dXJl`],
    ['claims that are not an object', `${HEADER}.WzFd.c2lnbmF0dXJl`],
    ['claims that are null', `${HEADER}.bnVsbA.c2lnbmF0dXJl`],
    ['bytes that are not UTF-8', `${HEADER}.eyJuYW1lIjoi_yJ9.c2lnbmF0dXJl`],
  ])('refuses a token with %s', (_what, token) => {
    expect(() => readIdToken(token)).toThrow('not an ID token');
  });
});

describe('an SNU account', () => {
  it('is one whose hosted domain is snu.ac.kr', () => {
    expect(isSnuAccount(readIdToken(KOREAN_NAME))).toBe(true);
  });

  it('is not a Gmail account, which has no hosted domain', () => {
    expect(isSnuAccount(readIdToken(GMAIL))).toBe(false);
  });

  it("is not another organisation's account, nor one whose address alone ends in snu.ac.kr", () => {
    expect(isSnuAccount(readIdToken(idTokenOf({ email: 'a@korea.ac.kr', hd: 'korea.ac.kr' })))).toBe(false);
    expect(isSnuAccount(readIdToken(idTokenOf({ email: 'a@snu.ac.kr' })))).toBe(false);
    expect(isSnuAccount(readIdToken(idTokenOf({ email: 'a@x.kr', hd: 'evil-snu.ac.kr' })))).toBe(false);
  });
});
