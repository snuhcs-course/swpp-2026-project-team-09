/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { maskedPost } from '../src/global-events/judgement-post.js';

function maskedText(text: string): string {
  return maskedPost({ title: '', text }).text;
}

describe('maskedPost', () => {
  it.each([
    ['문의: snu.now+events@snu.ac.kr', '문의: [이메일]'],
    ['전화 02-880-1234', '전화 [전화번호]'],
    ['전화 02)880-1234', '전화 [전화번호]'],
    ['휴대폰 010-1234-5678', '휴대폰 [전화번호]'],
    ['휴대폰 010 1234 5678', '휴대폰 [전화번호]'],
    ['휴대폰 010.1234.5678', '휴대폰 [전화번호]'],
    ['휴대폰 01012345678', '휴대폰 [전화번호]'],
    ['대표 0318801234', '대표 [전화번호]'],
  ])('masks %s', (written, expected) => {
    expect(maskedText(written)).toBe(expected);
  });

  it.each([
    '2026. 10. 13.(화) 17:00',
    '2026-01-05 09:00',
    '2026.01.05-2026.02.10',
    '09.01-12.25',
    '10:00~12:00',
    '오전 09시 30분',
    '132동 103호',
    // A phone number that does not start with 0.
    '880-1234',
  ])('leaves %s', (written) => {
    expect(maskedText(written)).toBe(written);
  });

  it('masks the title too', () => {
    expect(maskedPost({ title: '문의 a@snu.ac.kr', text: '' }).title).toBe('문의 [이메일]');
  });
});
