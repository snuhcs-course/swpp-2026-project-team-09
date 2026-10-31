/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { parseExtraSnuListPage } from '../src/event/extra-snu-list-page.parser.js';
import { savedPage } from './pages.js';

const listPage = (page: number): string => savedPage(`extra-snu-list-page-${page}-2026-10-31`);

describe('A page of the list of programmes', () => {
  it('gives its programmes in order, by the key the detail page is asked for with', () => {
    expect(parseExtraSnuListPage(listPage(1)).map(({ key }) => key)).toEqual([
      'PGM012002407',
      'PGM012002417',
      'PGM012002416',
      'PGM012002414',
    ]);
    expect(parseExtraSnuListPage(listPage(1))[3]).toEqual({ key: 'PGM012002414', title: 'IEEE Authorship Seminar' });
  });

  it('past the end gives none', () => {
    expect(parseExtraSnuListPage(listPage(8))).toEqual([]);
  });

  it('that is another page is refused', () => {
    expect(() => parseExtraSnuListPage('<html><body>로그인</body></html>')).toThrow(
      'The page has no list of programmes',
    );
  });

  it('whose programme has no key is refused', () => {
    expect(() => parseExtraSnuListPage(listPage(2).replaceAll('global.write(', 'other('))).toThrow(
      'A programme of the list has no key',
    );
  });
});
