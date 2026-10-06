import { parseVeterinaryMenuPage } from '../src/menu/veterinary-menu-page.parser.js';
import { savedMenuMessages } from '../src/menu/saved-menus.js';
import { savedPage } from './pages.js';

describe("The demo profile's menus", () => {
  it('give the saved pages as the menus of today and the six days after', async () => {
    const messages = await savedMenuMessages(new Date('2026-10-06T09:00:00+09:00'));
    const week = ['2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12'];

    expect(messages.map(({ source }) => source)).toStrictEqual(['coop_menus', 'dormitory_menus', 'veterinary_menus']);
    for (const { days } of messages) {
      expect(days.map(({ date }) => date)).toStrictEqual(week);
    }
    const [coop, dormitory] = messages;
    const coopNames = coop?.days[0]?.restaurants.map(({ name }) => name) ?? [];
    expect(coopNames).toContain('학생회관식당');
    expect(coopNames.some((name) => name.startsWith('* ') || name === '기숙사식당')).toBe(false);
    expect(dormitory?.days[6]?.restaurants).toStrictEqual(dormitory?.days[0]?.restaurants);
    expect(dormitory?.days[0]?.restaurants.length).toBeGreaterThan(0);
  });

  it("move the veterinary college's week to the current week, each weekday keeping its menu", async () => {
    const [, , veterinary] = await savedMenuMessages(new Date('2026-10-06T09:00:00+09:00'));
    const saved = parseVeterinaryMenuPage(savedPage('veterinary-menus-2026-10-01'), ['2026-09-29', '2026-10-02']);

    // Tuesday and Friday, as the saved week's; the weekend and the next Monday have none.
    expect(veterinary?.days[0]?.restaurants).toStrictEqual(saved[0]?.restaurants);
    expect(veterinary?.days[3]?.restaurants).toStrictEqual(saved[1]?.restaurants);
    expect(veterinary?.days[0]?.restaurants).toHaveLength(1);
    expect(veterinary?.days[4]?.restaurants).toStrictEqual([]);
    expect(veterinary?.days[6]?.restaurants).toStrictEqual([]);
  });
});
