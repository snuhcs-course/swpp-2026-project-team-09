/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type Lookup } from '../src/assistant/dto/answer.dto.js';
import { type DayItem, onDay } from '../src/assistant/free-time/free-time.js';
import { type Cafe, type CafeAnswer, cafeWay } from '../src/assistant/lookup/cafe-way.js';
import { readSeedFile, SEED_DIRECTORY } from '../src/common/seed-directory.js';
import { classAt, id, ME, nearestPlace, numbered, readCampus, TUESDAY, wayArgs } from './way-example.js';

// A café on the way (board q9): on Tuesday 2026-11-17 at 12:30 at 301동, before a 13:00 Class in 24동, with the cafés of
// seed/openstreetmap-cafes.json, each tied here to the seeded Place whose point is nearest, and the seed's walking
// table.

const AT_301 = { latitude: 37.45021, longitude: 126.95262 };

const fileSchema = z.object({
  cafes: z.array(z.object({ name: z.string(), latitude: z.number(), longitude: z.number() })),
});

let cafes: Cafe[] = [];

beforeAll(async () => {
  await readCampus();
  const seeded = await readSeedFile(SEED_DIRECTORY, 'openstreetmap-cafes.json', fileSchema);
  cafes = seeded.cafes.map(({ name, latitude, longitude }) => ({
    name,
    placeId: nearestPlace({ latitude, longitude }).id,
    at: { latitude, longitude },
  }));
});

const strong = (text: string): { text: string; strong: boolean } => ({ text, strong: true });
const plain = (text: string): { text: string; strong: boolean } => ({ text, strong: false });

const toClass = (): DayItem[] => [classAt(TUESDAY, '13:00', '13:50', '자연과학관6')];

function cafeAt(clock: string, items: DayItem[] = toClass(), toPlaceId: string | null = null): CafeAnswer {
  return cafeWay(
    wayArgs(onDay(TUESDAY, clock), {
      me: { userId: ME, name: '유상', items },
      location: { at: AT_301, placeId: id('제1공학관'), onCampus: true },
      toPlaceId,
    }),
    cafes,
  );
}

function lookupOf(answer: CafeAnswer): Lookup {
  if (answer.result !== 'found') {
    throw new Error(`No café: ${answer.reason}`);
  }
  return answer.lookup;
}

describe('Board q9: a café on the way to the 13:00 Class in 24동', () => {
  it('picks the café of the fewest extra minutes, nearest the Class among those that tie', () => {
    const lookup = lookupOf(cafeAt('12:30'));
    expect(lookup.chips.map(({ text }) => text)).toEqual(['301동에서', '13:00 수업까지', '카페']);
    expect(lookup.lines).toEqual([[strong('공차'), plain('에 들러요')], [plain('돌아가는 길 +1분 · 12:45 도착')]]);
    expect(lookup.basis).toEqual([
      '바로 가면 15분, 들르면 15분 + 1분',
      '세 곳 다 +1분이라 24동에 가장 가까운 곳을 골랐어요',
      '12:59에 나서면 13:00 수업에 맞아요 · 24동까지 걸어서 1분',
      '카페는 OpenStreetMap에 올라 있는 곳만 찾아요',
    ]);
  });

  it('draws the pick and the next two with their extra minutes, the walks, and the stay on the band', () => {
    const { scene, band, actions } = lookupOf(cafeAt('12:30'));
    expect(scene.places.map(({ role, tag }) => [role, tag])).toEqual([
      ['pick', '공차 · +1분'],
      ['candidate', 'Cafe ING · +1분'],
      ['candidate', 'Cafe MUG · +1분'],
      ['next', '13:00 수업 · 24동'],
    ]);
    expect(scene.routes.map(({ role, minutes }) => [role, minutes])).toEqual([
      ['me', 15],
      ['next', 1],
    ]);
    expect(scene.flags.map(({ text }) => text)).toEqual(['12:45 도착 · 12:59까지 있어요']);
    expect(band?.text).toBe('12:45–12:59 · 카페');
    expect(actions).toEqual([{ kind: 'guide', to: expect.objectContaining({ label: '공차' }) as unknown }]);
  });

  it('gives the model the cafés in order, with their Places, extra minutes, and stays', () => {
    expect(cafeAt('12:30')).toMatchObject({
      words: {
        from: '301동',
        to: '24동',
        directMinutes: 15,
        cafes: [
          { name: '공차', place: '63동', extraMinutes: 1, arrival: '12:45', until: '12:59' },
          { name: 'Cafe ING', place: '28동', extraMinutes: 1, arrival: '12:42', until: '12:56' },
          { name: 'Cafe MUG', place: '44-1동', extraMinutes: 1, arrival: '12:38', until: '12:52' },
        ],
      },
    });
  });
});

describe('A café on the way, otherwise', () => {
  it('is on the way with no extra minutes when the Place gone to holds one', () => {
    const lookup = lookupOf(cafeAt('12:30', [], numbered('63').id));
    expect(lookup.lines[1]).toEqual([plain('가는 길에 있어요 · 12:45 도착')]);
    expect(lookup.chips.map(({ text }) => text)).toEqual(['301동에서', '카페']);
    expect(lookup.band).toBeNull();
  });

  it('is none when the Class starts too soon to stop anywhere', () => {
    expect(cafeAt('12:58')).toEqual({ result: 'none', reason: 'no-time' });
  });

  it('is none with nothing later today and no Place named', () => {
    expect(cafeAt('12:30', [])).toEqual({ result: 'none', reason: 'no-next' });
  });

  it('is none without any café', () => {
    cafes = [];
    expect(cafeAt('12:30')).toEqual({ result: 'none', reason: 'no-cafe' });
  });
});
