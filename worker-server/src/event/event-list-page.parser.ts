/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-02  Opus 5.5   prompted by TaeHyun79
 * 2026-10-03  Opus 5.5   prompted by TaeHyun79
 * 2026-10-04  Opus 5.5   prompted by TaeHyun79
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { load } from 'cheerio';
import { clean } from './event-page.parser.js';
import { type ListFilter } from './events-list.js';

export interface ListedPost {
  postNumber: number;
  title: string;
}

// Reads the posts a page of the events list lists, in its order. A page past the end lists none.
export function parseEventListPage(html: string, filter: ListFilter): ListedPost[] {
  const $ = load(html);
  const items = $('.event-board .board-imgline a.item');
  // Another page, such as the firewall's block page, can come with status 200 too, so the content is checked.
  if (items.length === 0 && $('.event-board .board-noresult').length === 0) {
    throw new Error('The page has no events list');
  }
  // Read without its filter, the list would run to some 600 pages.
  if ($('input[name="df"]').val() !== filter.from || $('input[name="dt"]').val() !== filter.to) {
    throw new Error(`The page is not the events list from ${filter.from} to ${filter.to}`);
  }
  return items.toArray().flatMap((item) => {
    const postNumber = /[?&]bbsidx=(\d+)/u.exec($(item).attr('href') ?? '')?.[1];
    if (postNumber === undefined) {
      // A post that links out of the board opens in a new window and has no page here to read. A page whose posts all
      // link out would read as the end of the list; none has been seen.
      if ($(item).attr('target') === '_blank') {
        return [];
      }
      throw new Error('A post of the events list has no number');
    }
    const title = clean($(item).find('.title').text());
    if (title === '') {
      throw new Error('A post of the events list has no title');
    }
    return [{ postNumber: Number(postNumber), title }];
  });
}
