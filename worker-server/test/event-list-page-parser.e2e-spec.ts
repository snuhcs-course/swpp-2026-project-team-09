import { parseEventListPage } from '../src/event/event-list-page.parser.js';
import { blockPage, savedPage } from './pages.js';

// The filter the saved pages were asked for: the events from 2 October 2026 to a year later.
const filter = { from: '2026.10.02', to: '2027.10.02' };

const firstPage = savedPage('snu-events-list-page-1-2026-10-02');

describe('A page of the events list', () => {
  it('gives the post number of each post it lists, in its order', () => {
    expect(parseEventListPage(firstPage, filter)).toEqual([
      176576, 176564, 176561, 176558, 176549, 176540, 176525, 176522, 176519, 176516, 176510, 176504,
    ]);
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
});
