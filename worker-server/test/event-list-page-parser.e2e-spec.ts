/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-02  Opus 5.5   prompted by TaeHyun79
 * 2026-10-03  Opus 5.5   prompted by TaeHyun79
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { parseEventListPage } from '../src/event/event-list-page.parser.js';
import { blockPage, savedPage } from './pages.js';

// The filter the saved pages were asked for: the events from 2 October 2026 to a year later.
const filter = { from: '2026.10.02', to: '2027.10.02' };

const firstPage = savedPage('snu-events-list-page-1-2026-10-02');

describe('A page of the events list', () => {
  it('gives the post number and the title of each post it lists, in its order', () => {
    const posts = parseEventListPage(firstPage, filter);

    expect(posts.map(({ postNumber }) => postNumber)).toEqual([
      176576, 176564, 176561, 176558, 176549, 176540, 176525, 176522, 176519, 176516, 176510, 176504,
    ]);
    expect(posts[0]).toEqual({ postNumber: 176576, title: '[참가자 모집]제1회 과학데이터혁신 경진대회 개최' });
  });

  it('gives no post past the end of the list', () => {
    expect(parseEventListPage(savedPage('snu-events-list-page-9-2026-10-02'), filter)).toEqual([]);
  });

  it('is not read when it lists the events of other dates than those asked for', () => {
    expect(() => parseEventListPage(firstPage, { from: '2026.10.03', to: '2027.10.03' })).toThrow(
      'The page is not the events list from 2026.10.03 to 2027.10.03',
    );
  });

  it("is not read when it is the firewall's block page", () => {
    expect(() => parseEventListPage(blockPage, filter)).toThrow('The page has no events list');
  });

  it('is not read when a post it lists has no number', () => {
    // The link of the first post without its bbsidx.
    const withoutNumber = firstPage.replace('href="/snunow/events?md=v&bbsidx=176576"', 'href="/snunow/events?md=v"');

    expect(() => parseEventListPage(withoutNumber, filter)).toThrow('A post of the events list has no number');
  });

  it('is not read when a post it lists has no title', () => {
    // The first post of the page with its title emptied.
    const withoutTitle = firstPage.replace(
      '<span class="title">[참가자 모집]제1회 과학데이터혁신 경진대회 개최</span>',
      '<span class="title"></span>',
    );

    expect(() => parseEventListPage(withoutTitle, filter)).toThrow('A post of the events list has no title');
  });
});
