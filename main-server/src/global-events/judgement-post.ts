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

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/gu;

// A phone number starting with 0, with or without separators: "02-880-1234", "02)880-1234", "010 1234 5678",
// "01012345678". Three groups of digits in these lengths are not a date or a time, and a number inside a longer run of
// digits and separators, such as a date's "2026.01.05", is not one.
const PHONE = /(?<![\d.-])(?:0\d{1,2}[-.\s)]{1,2}\d{3,4}[-.\s]\d{4}|0\d{9,10})(?![\d.-]*\d)/gu;

const EMAIL_MASK = '[이메일]';
const PHONE_MASK = '[전화번호]';

function masked(text: string): string {
  return text.replaceAll(EMAIL, EMAIL_MASK).replaceAll(PHONE, PHONE_MASK);
}

export function maskedPost({ title, text }: JudgedPost): JudgedPost {
  return { title: masked(title), text: masked(text) };
}
