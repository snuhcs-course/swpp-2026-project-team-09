import { type RestaurantMenu } from '../src/menu/dto/menus-collected.dto.js';
import { parseVeterinaryMenuPage } from '../src/menu/veterinary-menu-page.parser.js';
import { savedPage } from './pages.js';

// The week of Monday 28 September to Friday 2 October 2026.
const weekPage = savedPage('veterinary-menus-2026-10-01');

// The cafeteria with one lunch dish, as the page gives it: without a price.
function lunchOf(dish: string): RestaurantMenu {
  return { name: '수의대식당', lines: [{ meal: 'lunch', text: dish, kind: 'dish', price: null }] };
}

describe("The veterinary college's week table", () => {
  it('gives the lunch of each day asked for', () => {
    expect(parseVeterinaryMenuPage(weekPage, ['2026-10-01', '2026-10-02'])).toEqual([
      { date: '2026-10-01', restaurants: [lunchOf('카레라이스')] },
      { date: '2026-10-02', restaurants: [lunchOf('소불고기덮밥')] },
    ]);
  });

  it('gives a day without a row no restaurant', () => {
    expect(parseVeterinaryMenuPage(weekPage, ['2026-10-03'])).toEqual([{ date: '2026-10-03', restaurants: [] }]);
  });
});

describe("The veterinary college's week table at the turn of the year", () => {
  // The saved table with the dates of the last week of 2026 in place of its own. The page writes no year.
  const newYearPage = [
    ['9. 28(월)', '12. 28(월)'],
    ['9. 29(화)', '12. 29(화)'],
    ['9. 30(수)', '12. 30(수)'],
    ['10. 1(목)', '12. 31(목)'],
    ['10. 2(금)', '1. 1(금)'],
  ].reduce((page, [from, to]) => page.replaceAll(from, to), weekPage);

  it('gives the December and the January row to the days of two years', () => {
    expect(parseVeterinaryMenuPage(newYearPage, ['2026-12-31', '2027-01-01'])).toEqual([
      { date: '2026-12-31', restaurants: [lunchOf('카레라이스')] },
      { date: '2027-01-01', restaurants: [lunchOf('소불고기덮밥')] },
    ]);
  });

  it('settles the year of a row by its weekday', () => {
    // 1 January 2026 was a Thursday, so the row of Friday 1 January is not that day's.
    expect(parseVeterinaryMenuPage(newYearPage, ['2026-01-01'])).toEqual([{ date: '2026-01-01', restaurants: [] }]);
  });
});

describe('A page that is not the week table the parser knows', () => {
  it('is refused when it has no table of lunches', () => {
    // What the university's firewall answers a blocked request with, as external-sources.md, 2 describes it.
    const blockPage =
      '<html><head><meta http-equiv="refresh" content="0; url=https://snucert.snu.ac.kr/waf/error.html"></head></html>';

    expect(() => parseVeterinaryMenuPage(blockPage, ['2026-10-01'])).toThrow('The page has no week table');
  });

  it('is refused when a row does not start with a day written as the parser expects', () => {
    const rewritten = weekPage.replaceAll('10. 1(목)', '10/1 목요일');

    expect(() => parseVeterinaryMenuPage(rewritten, ['2026-10-01'])).toThrow(
      'The week table has a row without a day: "10/1 목요일"',
    );
  });
});
