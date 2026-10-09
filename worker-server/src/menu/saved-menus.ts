// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import { readFile } from 'node:fs/promises';
import { seoulDay } from '../common/seoul-day.js';
import { type MenusCollectedMessage } from './dto/menus-collected.dto.js';
import { coopRestaurants } from './menu.collector.js';
import { parseMenuPage } from './menu-page.parser.js';
import { parseVeterinaryMenuPage } from './veterinary-menu-page.parser.js';

// The pages saved for the parsers' tests, of Thursday 1 October 2026 and its week.
const SAVED_PAGES = new URL('../../test/pages/', import.meta.url);
const SAVED_DAY = '2026-10-01';
const SAVED_MONDAY = Date.UTC(2026, 8, 28);
const DAY = 24 * 60 * 60 * 1000;
const WEEKDAYS = '일월화수목금토';

function savedPage(name: string): Promise<string> {
  return readFile(new URL(`${name}-${SAVED_DAY}.html`, SAVED_PAGES), 'utf8');
}

// The veterinary college's week table moved by whole weeks to the week of `today`, so that each weekday keeps its menu.
function movedWeek(html: string, today: string): string {
  const day = new Date(`${today}T00:00:00Z`);
  const monday = day.getTime() - ((day.getUTCDay() + 6) % 7) * DAY;
  const shift = Math.round((monday - SAVED_MONDAY) / DAY);
  return html.replaceAll(/(\d+)\.\s*(\d+)\s*\((.)\)/gu, (_, month: string, dayOfMonth: string) => {
    const moved = new Date(Date.UTC(2026, Number(month) - 1, Number(dayOfMonth)) + shift * DAY);
    return `${moved.getUTCMonth() + 1}. ${moved.getUTCDate()}(${WEEKDAYS[moved.getUTCDay()] ?? ''})`;
  });
}

// What a Collection of each menu Source would send if the saved pages were the pages of today and the six days after:
// the demo profile's menus (README.md: Demo menus).
export async function savedMenuMessages(now: Date): Promise<MenusCollectedMessage[]> {
  const dates = Array.from({ length: 7 }, (_, days) => seoulDay(now, days));
  const [coop, dormitory, veterinary] = await Promise.all(
    ['coop-menus', 'dormitory-menus', 'veterinary-menus'].map((name) => savedPage(name)),
  );
  const daily = (html: string): MenusCollectedMessage['days'] =>
    dates.map((date) => ({ date, restaurants: parseMenuPage(html, SAVED_DAY) }));
  const collectedAt = now.toISOString();
  return [
    {
      source: 'coop_menus',
      collectedAt,
      days: daily(coop ?? '').map(({ date, restaurants }) => ({ date, restaurants: coopRestaurants(restaurants) })),
    },
    { source: 'dormitory_menus', collectedAt, days: daily(dormitory ?? '') },
    {
      source: 'veterinary_menus',
      collectedAt,
      days: parseVeterinaryMenuPage(movedWeek(veterinary ?? '', dates[0] ?? SAVED_DAY), dates),
    },
  ];
}
