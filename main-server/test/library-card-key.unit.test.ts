/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { CATALOGUE_FILE, type Catalogue, readCatalogue } from '../src/assistant/library/catalogue.js';
import { bookCard, isLibraryKey, LIBRARY_KEY_MAX } from '../src/assistant/library/library-card.js';

let catalogue: Catalogue;

beforeAll(async () => {
  catalogue = await readCatalogue(CATALOGUE_FILE);
});

describe("A library card's key", () => {
  it.each([
    'book:7F-7A-zone2:2026-11-04:1700:60',
    'book:7F-7A-zone2:2026-11-04:1700:60:s=7193',
    'book:4F-group-6:2026-11-05:1500:120:e=with-monitor',
    'book:6F-xr:2026-11-05:1000:60:s=VR 1:e=VR 1/VR 2',
    'seats:8F-8A-zone1-quiet:2026-11-04',
    'seats:7F-7A-zone2:2026-11-04:1030:120',
    'cancel:-:-:-',
    'cancel:4F-group-6:2026-11-05:1500',
    'return:-',
    'return:7F-7A-zone2',
    'myBookings:2026-10-28:2026-11-07',
  ])('accepts %s', (key) => {
    expect(isLibraryKey(key)).toBe(true);
  });

  it.each([
    '',
    'book:7F-7A-zone2:2026-11-04:1700',
    'book:7F-7A-zone2:2026-11-04:17:00:60',
    'book:7F 7A:2026-11-04:1700:60',
    'reserve:7F-7A-zone2:2026-11-04:1700:60',
    'seats:7F-7A-zone2',
    'return:7F-7A-zone2:extra',
    'myBookings:2026-10-28',
    `book:${'A'.repeat(40)}:2026-11-04:1700:60:s=${'B'.repeat(40)}:e=${'C'.repeat(40)}`,
  ])('refuses %s', (key) => {
    expect(isLibraryKey(key)).toBe(false);
  });
});

describe('The key bookCard writes', () => {
  it('is what bookCard writes, within its length, for every bookable space', () => {
    for (const space of catalogue.spaces.filter(({ implemented, bookable }) => implemented && bookable)) {
      const [group] = space.equipmentGroups;
      const [room] = space.rooms.keys();
      const card = bookCard(space, {
        date: '2026-11-05',
        start: '15:00',
        minutes: space.maxMinutes,
        seat: room ?? '7193',
        equipment: group ?? null,
        useDesc: null,
        companions: [],
        questId: null,
      });

      expect(card.library.key.length).toBeLessThanOrEqual(LIBRARY_KEY_MAX);
      expect(isLibraryKey(card.library.key)).toBe(true);
    }
  });
});
