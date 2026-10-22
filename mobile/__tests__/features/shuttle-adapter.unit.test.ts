/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-23  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

// Partitions: the service hours' edges; a vehicle new, unmoved, a stop on, past stops, behind, past the loop's end,
// with less motion and gone; the cards. Expected values: P15-02's criteria and a rectangle loop worked by hand.

import type { ShuttleRoute, ShuttleStop, ShuttleVehicle } from '@/api/shuttle-types';
import {
  along,
  inService,
  nextTravels,
  stepOn,
  type Travel,
  toShuttleCards,
  toShuttleView,
} from '@/features/shuttle/adapter';

// A loop clockwise round a rectangle: 111.32 m north, 88.90 m east (0.001° at 37°), back south and west.
const NORTH = 111.32;
const EAST = 0.001 * 111_320 * Math.cos((37 * Math.PI) / 180);
const LOOP = 2 * NORTH + 2 * EAST;

function stop(id: string, latitude: number, longitude: number): ShuttleStop {
  return { id, name: id, latitude, longitude };
}

const STOPS = [
  stop('정문', 37, 127),
  stop('신양', 37.001, 127),
  stop('공대', 37.001, 127.001),
  stop('기숙사', 37, 127.001),
];
const ROUTE: ShuttleRoute = {
  serviceHours: '평일 08:00–21:00',
  stops: STOPS,
  line: [...STOPS, STOPS[0] ?? stop('정문', 37, 127)].map(({ latitude, longitude }) => ({ latitude, longitude })),
};
const VIEW = toShuttleView(ROUTE);

function at(carId: string, index: number): ShuttleVehicle {
  return { carId, stop: STOPS[index] ?? stop('?', 0, 0), receivedAt: '2026-10-06T03:00:00Z' };
}

function placed(carId: string, index: number): Travel {
  return (
    nextTravels([], [at(carId, index)], VIEW, true)[0] ?? { carId, stop: -1, from: 0, to: 0, step: 0, placed: false }
  );
}

describe('inService', () => {
  it.each([
    ['a weekday at 07:59', '2026-10-06T07:59:00+09:00', false],
    ['a weekday at 08:00', '2026-10-06T08:00:00+09:00', true],
    ['a weekday at 20:59', '2026-10-06T20:59:00+09:00', true],
    ['a weekday at 21:00', '2026-10-06T21:00:00+09:00', false],
    ['a Saturday at noon', '2026-10-10T12:00:00+09:00', false],
    ['a Sunday at noon', '2026-10-11T12:00:00+09:00', false],
    ['a Friday at noon', '2026-10-09T12:00:00+09:00', true],
  ])('%s in Korea → %s', (_, instant, expected) => {
    expect(inService(new Date(instant))).toBe(expected);
  });
});

describe('toShuttleView', () => {
  it("a rectangle loop → its length, and each stop's point along it", () => {
    expect(VIEW.line.length).toBeCloseTo(LOOP, 1);
    const expected = [0, NORTH, NORTH + EAST, 2 * NORTH + EAST];
    for (const [index, metres] of expected.entries()) {
      expect(VIEW.stopAlong[index]).toBeCloseTo(metres, 1);
    }
  });
});

describe('nextTravels', () => {
  it('a vehicle seen first → placed at its stop without a glide', () => {
    expect(placed('car', 1)).toEqual({
      carId: 'car',
      stop: 1,
      from: VIEW.stopAlong[1],
      to: VIEW.stopAlong[1],
      step: 10,
      placed: true,
    });
  });

  it('a vehicle at the same stop → its trip kept', () => {
    const travel = { ...placed('car', 1), step: 4 };
    expect(nextTravels([travel], [at('car', 1)], VIEW, true)).toEqual([travel]);
  });

  it('a vehicle at the next stop → a trip from its stop to the next, one step taken', () => {
    const [travel] = nextTravels([placed('car', 0)], [at('car', 1)], VIEW, true);
    expect(travel).toMatchObject({ stop: 1, from: 0, step: 1, placed: false });
    expect(travel?.to).toBeCloseTo(NORTH, 1);
  });

  it('a vehicle two stops on, half the loop → one trip past the stop skipped', () => {
    const [travel] = nextTravels([placed('car', 0)], [at('car', 2)], VIEW, true);
    expect(travel).toMatchObject({ stop: 2, from: 0, step: 1 });
    expect(travel?.to).toBeCloseTo(NORTH + EAST, 1);
  });

  it('a vehicle at the stop behind → placed there at once', () => {
    expect(nextTravels([placed('car', 0)], [at('car', 3)], VIEW, true)).toEqual([placed('car', 3)]);
  });

  it('a vehicle from the last stop to the first → forward past the end of the loop', () => {
    const [travel] = nextTravels([placed('car', 3)], [at('car', 0)], VIEW, true);
    expect(travel?.from).toBeCloseTo(2 * NORTH + EAST, 1);
    expect(travel?.to).toBeCloseTo(LOOP, 1);
  });

  it('a phone that asks for less motion → every move placed at once', () => {
    expect(nextTravels([placed('car', 0)], [at('car', 1)], VIEW, false)).toEqual([placed('car', 1)]);
  });

  it.each([
    ['missing from the set', []],
    ['now at a stop not on the route', [{ ...at('car', 0), stop: stop('외부', 37.5, 127.5) }]],
  ])('a vehicle %s → gone', (_, vehicles) => {
    expect(nextTravels([placed('car', 0)], vehicles, VIEW, true)).toEqual([]);
  });
});

describe('a trip of a vehicle', () => {
  const trip: Travel = { carId: 'car', stop: 1, from: 0, to: 100, step: 1, placed: false };

  it('step 5 of 10 → half way along', () => {
    expect(along({ ...trip, step: 5 })).toBe(50);
  });

  it('a step on → one more step, gliding', () => {
    expect(stepOn({ ...trip, placed: true })).toEqual({ ...trip, step: 2, placed: false });
  });

  it('a step on at the stop → the trip kept', () => {
    const arrived = { ...trip, step: 10 };
    expect(stepOn(arrived)).toBe(arrived);
  });
});

describe('toShuttleCards', () => {
  it('the stops → in loop order, each naming the next, the last naming the first', () => {
    const cards = toShuttleCards(VIEW, []);
    expect(cards.map(({ id, title, lines }) => [id, title, lines[0]?.text])).toEqual([
      ['shuttle-stop:정문', '정문 정류장', '다음 정류장 신양'],
      ['shuttle-stop:신양', '신양 정류장', '다음 정류장 공대'],
      ['shuttle-stop:공대', '공대 정류장', '다음 정류장 기숙사'],
      ['shuttle-stop:기숙사', '기숙사 정류장', '다음 정류장 정문'],
    ]);
    expect(cards[0]).toMatchObject({ kind: 'shuttle-stop', subLabel: '셔틀버스 · 교내 순환', primary: null });
  });

  it('a vehicle placed at a stop → after the stops, at the stop, without a glide', () => {
    const vehicle = toShuttleCards(VIEW, [placed('car', 1)])[4];
    expect(vehicle).toMatchObject({
      id: 'shuttle-vehicle:car',
      kind: 'shuttle-vehicle',
      subLabel: '셔틀버스 · 운행 중',
      title: '교내 순환 셔틀',
      lines: [{ icon: 'route', text: '신양에 있어요 · 다음 정류장 공대' }],
      primary: { label: '노선 보기', action: 'shuttle-line' },
      glideMs: 0,
    });
    expect(vehicle?.position.latitude).toBeCloseTo(37.001, 6);
    expect(vehicle?.position.longitude).toBeCloseTo(127, 6);
  });

  it('a vehicle on its way → a glide of one second', () => {
    const [travel] = nextTravels([placed('car', 0)], [at('car', 1)], VIEW, true);
    const vehicle = toShuttleCards(VIEW, travel === undefined ? [] : [travel])[4];
    expect(vehicle?.glideMs).toBe(1000);
  });
});
