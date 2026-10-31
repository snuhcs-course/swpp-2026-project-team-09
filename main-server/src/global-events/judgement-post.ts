/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

// What a Judgement reads of a post, and all that leaves the server.
export interface JudgedPost {
  title: string;
  text: string;
}

const EMAIL = /[\p{L}\p{N}._+-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+/gu;

// A phone number starting with 0, with or without separators: "02-880-1234", "02)880-1234", "010 1234 5678",
// "0507-1234-5678", "010-12345678", "01012345678". A zero right after a digit and a separator is inside a date, as in
// "2026.01.05", or follows one, as in "11/02 1400-1600". Masking too much only fails the checks (ADR 0008).
const PHONE = /(?<!\d|\d[./-])(?:0\d{1,3}[-.\s)]{1,2}\d{3,4}[-.\s]\d{4}|0\d{1,3}[-.\s)]{1,2}\d{7,8}|0\d{9,10})(?!\d)/gu;

const EMAIL_MASK = '[이메일]';
const PHONE_MASK = '[전화번호]';

function masked(text: string): string {
  return text.replaceAll(EMAIL, EMAIL_MASK).replaceAll(PHONE, PHONE_MASK);
}

export function maskedPost({ title, text }: JudgedPost): JudgedPost {
  return { title: masked(title), text: masked(text) };
}
