/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

const SITE = 'https://extra.snu.ac.kr';

// 0001 모집중, 0002 마감임박 and 0004 모집대기, the list the site shows by default. It leaves out 0003 모집마감, whose
// programmes can no longer be applied for and which would take up the pages read.
const APPLICATION_STATES = ['0001', '0002', '0004'];

// The newest programmes come first, twelve to a page.
export function listPageAddress(page: number): string {
  const states = APPLICATION_STATES.map((state) => `&applyChkCdSh=${state}`).join('');
  return `${SITE}/ptfol/pgm/index.do?currentPageNo=${page}${states}`;
}

// Redirects, past the waiting room, to the programme's page, whose own address holds no `dataSeq`.
export function programmeAddress(key: string): string {
  return `${SITE}/ptfol/pgm/view.do?dataSeq=${key}`;
}
