import { load } from 'cheerio';
import { clean } from './event-page.parser.js';
import { type ListFilter } from './events-list.js';

// A post as the list shows it.
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
  return items.toArray().map((item) => {
    const postNumber = /[?&]bbsidx=(\d+)/u.exec($(item).attr('href') ?? '')?.[1];
    if (postNumber === undefined) {
      throw new Error('A post of the events list has no number');
    }
    const title = clean($(item).find('.title').text());
    if (title === '') {
      throw new Error('A post of the events list has no title');
    }
    return { postNumber: Number(postNumber), title };
  });
}
