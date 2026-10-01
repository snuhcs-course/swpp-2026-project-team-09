import { load } from 'cheerio';
import { type MenuDay } from './dto/menus-collected.dto.js';
import { readMenuLines } from './menu-line.js';

// The page names no restaurant.
const RESTAURANT = '수의대식당';

const WEEKDAYS = '일월화수목금토';

// Reads the lunch of each of `dates` from the veterinary college's table of the current week.
export function parseVeterinaryMenuPage(html: string, dates: string[]): MenuDay[] {
  const $ = load(html);
  // A blocked request is answered with status 200 and another page, so the content is checked.
  const [dayHeader, lunchHeader] = $('table th')
    .toArray()
    .map((header) => $(header).text().replaceAll(/\s/gu, ''));
  if (dayHeader !== '일자' || lunchHeader !== '중식') {
    throw new Error('The page has no week table');
  }
  $('br').replaceWith('\n');
  const rows = $('table tr')
    .toArray()
    .map((row) => $(row).find('td').toArray())
    .filter((cells) => cells.length > 0)
    .map(([dayCell, lunch]) => {
      const text = $(dayCell).text().trim();
      // "10. 1(목)"
      const day = /^(\d+)\.\s*(\d+)\s*\((.)\)$/u.exec(text);
      if (day === null) {
        throw new Error(`The week table has a row without a day: "${text}"`);
      }
      return { month: Number(day[1]), dayOfMonth: Number(day[2]), weekday: day[3], lunch: $(lunch).text() };
    });
  return dates.map((date) => {
    const day = new Date(`${date}T00:00:00Z`);
    return {
      date,
      restaurants: rows
        .filter(
          // The table writes no year, so the weekday tells the 1 January of one year from the next's.
          ({ month, dayOfMonth, weekday }) =>
            month === day.getUTCMonth() + 1 && dayOfMonth === day.getUTCDate() && weekday === WEEKDAYS[day.getUTCDay()],
        )
        .map(({ lunch }) => ({ name: RESTAURANT, lines: readMenuLines('lunch', lunch) })),
    };
  });
}
