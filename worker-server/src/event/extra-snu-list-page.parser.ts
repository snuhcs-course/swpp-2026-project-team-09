/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { load } from 'cheerio';
import { clean } from './event-page.parser.js';

export interface ListedProgramme {
  key: string;
  title: string;
}

// Reads the programmes a page of the list lists, in its order. A page past the end lists none.
export function parseExtraSnuListPage(html: string): ListedProgramme[] {
  const $ = load(html);
  // Another page, such as a sign-in page, can come in its place. A page past the end still has the list's filter.
  if ($('input[name="applyChkCdSh"]').length === 0) {
    throw new Error('The page has no list of programmes');
  }
  return $('a.tit.ellipsis')
    .toArray()
    .map((item) => {
      const key = /global\.write\('(\w+)'/u.exec($(item).attr('onclick') ?? '')?.[1];
      if (key === undefined) {
        throw new Error('A programme of the list has no key');
      }
      const title = clean($(item).text());
      if (title === '') {
        throw new Error('A programme of the list has no title');
      }
      return { key, title };
    });
}
