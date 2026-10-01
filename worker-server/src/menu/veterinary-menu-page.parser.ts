import { load } from 'cheerio';
import { type MenuDay } from './dto/menus-collected.dto.js';
import { readMenuLines } from './menu-line.js';

// The page names no restaurant.
const RESTAURANT = '수의대식당';

const WEEKDAYS = '일월화수목금토';

// How the table writes a day, without its spaces: "10.1(목)". It writes no year, so the weekday tells the 1 January of
// one year from the next's.
function tableDay(date: string): string {
  const day = new Date(`${date}T00:00:00Z`);
  return `${day.getUTCMonth() + 1}.${day.getUTCDate()}(${WEEKDAYS[day.getUTCDay()]})`;
}

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
    .map(([day, lunch]) => ({ day: $(day).text().trim(), lunch: $(lunch).text() }));
  for (const { day } of rows) {
    if (!/^\d+\.\s*\d+\s*\(.\)$/u.test(day)) {
      throw new Error(`The week table has a row without a day: "${day}"`);
    }
  }
  return dates.map((date) => ({
    date,
    restaurants: rows
      .filter(({ day }) => day.replaceAll(/\s/gu, '') === tableDay(date))
      .map(({ lunch }) => ({
        name: RESTAURANT,
        // The lunch column holds the day's dishes.
        lines: readMenuLines('lunch', lunch).map(({ meal, text, kind, price }) => ({
          meal,
          text,
          kind: kind ?? 'dish',
          price,
        })),
      })),
  }));
}
