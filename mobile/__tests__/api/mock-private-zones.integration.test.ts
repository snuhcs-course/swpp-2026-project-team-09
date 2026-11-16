/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { answered, startFresh } from '../support/mocks';
import { BUILDING_301, offset, squareRound } from '../support/zone-shapes';
import { ApiError } from '@/api/errors';
import { mockClient } from '@/api/mock/client';
import type { LatLng } from '@/api/types';
import { now } from '@/clock';

// The mock of the Private Zones, which answers as the main server does (P02 spec, "The Private Zone"): kept in memory,
// none at the start, refused by the same rules, and an upload inside one is not kept. The mock's campus is the
// on-campus rectangle.

// On campus, more than 150 m from every Place of the mock's.
const NO_PLACE_NEAR: LatLng = { latitude: 37.447, longitude: 126.96 };
// 400 m south of the on-campus rectangle.
const FAR_SOUTH: LatLng = { latitude: 37.445 - 400 / 111_195, longitude: 126.952 };

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
});

afterEach(() => {
  jest.useRealTimers();
});

async function refusalOf(asked: Promise<unknown>): Promise<Pick<ApiError, 'status' | 'code'>> {
  try {
    await answered(asked);
  } catch (error) {
    if (error instanceof ApiError) {
      return { status: error.status, code: error.code };
    }
    throw error;
  }
  throw new Error('Not refused');
}

function upload(at: LatLng): ReturnType<typeof mockClient.uploadPosition> {
  return mockClient.uploadPosition({ ...at, accuracy: 10, measuredAt: now().toISOString() });
}

describe('the mock of the Private Zones', () => {
  it('starts with none', async () => {
    expect(await answered(mockClient.privateZones())).toEqual([]);
  });

  it('keeps an outline, named after the Place nearest its middle, and lists the oldest first', async () => {
    const outline = squareRound(BUILDING_301, 40);
    const kept = await answered(mockClient.addPrivateZone(outline));
    await answered(mockClient.addPrivateZone(squareRound(NO_PLACE_NEAR, 40)));

    expect(kept).toEqual({ id: kept.id, label: '301동 근처', outline, createdAt: now().toISOString() });
    expect((await answered(mockClient.privateZones())).map(({ label }) => label)).toEqual(['301동 근처', '그린 구역']);
  });

  it('removes a zone, and refuses one it does not hold', async () => {
    const kept = await answered(mockClient.addPrivateZone(squareRound(BUILDING_301, 40)));

    await answered(mockClient.removePrivateZone(kept.id));

    expect(await answered(mockClient.privateZones())).toEqual([]);
    expect(await refusalOf(mockClient.removePrivateZone(kept.id))).toEqual({
      status: 404,
      code: 'PRIVATE_ZONE_NOT_FOUND',
    });
  });
});

describe("the mock's refusals of a zone", () => {
  it.each<[string, LatLng[], number, string]>([
    ['two points', squareRound(BUILDING_301, 40).slice(0, 2), 400, 'PRIVATE_ZONE_INVALID'],
    [
      '201 points',
      Array.from({ length: 201 }, (_, index) => offset(BUILDING_301, index, index % 7)),
      400,
      'PRIVATE_ZONE_INVALID',
    ],
    ['a point 400 m off campus', [...squareRound(BUILDING_301, 40), FAR_SOUTH], 400, 'PRIVATE_ZONE_OFF_CAMPUS'],
    ['an outline wholly off campus', squareRound(FAR_SOUTH, 40), 400, 'PRIVATE_ZONE_OFF_CAMPUS'],
    ['an outline in a 17 m square', squareRound(BUILDING_301, 16), 400, 'PRIVATE_ZONE_TOO_SMALL'],
  ])('refuses %s', async (_, outline, status, code) => {
    expect(await refusalOf(mockClient.addPrivateZone(outline))).toEqual({ status, code });
  });

  it('refuses a sixth zone', async () => {
    await answered(
      Promise.all(
        [0, 100, 200, 300, 400].map((east) =>
          mockClient.addPrivateZone(squareRound(offset(BUILDING_301, east, 200), 40)),
        ),
      ),
    );

    expect(await refusalOf(mockClient.addPrivateZone(squareRound(BUILDING_301, 40)))).toEqual({
      status: 409,
      code: 'PRIVATE_ZONES_FULL',
    });
  });
});

describe("the mock's answer to an upload", () => {
  it('answers privateZone for an upload inside a zone or within 10 m of it, and not off campus', async () => {
    await answered(mockClient.setMasterSwitch(true));
    await answered(mockClient.addPrivateZone(squareRound(BUILDING_301, 40)));

    expect(await answered(upload(BUILDING_301))).toEqual({ offCampus: false, privateZone: true });
    expect(await answered(upload(offset(BUILDING_301, 28, 0)))).toEqual({ offCampus: false, privateZone: true });
    expect(await answered(upload(offset(BUILDING_301, 40, 0)))).toEqual({ offCampus: false, privateZone: false });
    expect(await answered(upload(FAR_SOUTH))).toEqual({ offCampus: true, privateZone: false });
  });
});
