// AI-generated with Claude Opus 5.5, 2026-10-02, prompted by TaeHyun79 and fyoon46, reviewed by fyoon46 in #26
import { type RestaurantMenu } from '../src/menu/dto/menus-collected.dto.js';
import { parseVeterinaryMenuPage } from '../src/menu/veterinary-menu-page.parser.js';
import { blockPage, savedPage } from './pages.js';

// The week of Monday 28 September to Friday 2 October 2026.
const weekPage = savedPage('veterinary-menus-2026-10-01');

// The cafeteria with the one line of a lunch cell. The line says neither what it is nor what it costs.
function lunchOf(dish: string): RestaurantMenu {
  return { name: '수의대식당', lines: [{ meal: 'lunch', text: dish, kind: null, name: null, price: null }] };
}

describe("The veterinary college's week table", () => {
  it('gives the lunch of each day asked for', () => {
    expect(parseVeterinaryMenuPage(weekPage, ['2026-10-01', '2026-10-02'])).toEqual([
      { date: '2026-10-01', restaurants: [lunchOf('카레라이스')] },
      { date: '2026-10-02', restaurants: [lunchOf('소불고기덮밥')] },
    ]);
  });

  it('gives a day its row when the table writes the day with a leading zero', () => {
    // The saved table with one day written with a leading zero.
    const padded = weekPage.replaceAll('10. 1(목)', '10. 01(목)');

    expect(parseVeterinaryMenuPage(padded, ['2026-10-01'])).toEqual([
      { date: '2026-10-01', restaurants: [lunchOf('카레라이스')] },
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
    expect(() => parseVeterinaryMenuPage(blockPage, ['2026-10-01'])).toThrow('The page has no week table');
  });

  it('is refused when a row does not start with a day written as the parser expects', () => {
    // The saved table with one day written another way.
    const rewritten = weekPage.replaceAll('10. 1(목)', '10/1 목요일');

    expect(() => parseVeterinaryMenuPage(rewritten, ['2026-10-01'])).toThrow(
      'The week table has a row without a day: "10/1 목요일"',
    );
  });
});
