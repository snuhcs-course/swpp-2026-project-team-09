import { readCampusBoundary } from '../src/common/campus-boundary.js';
import { metresBetween } from '../src/common/geometry.js';
import { readSeedFile, SEED_DIRECTORY } from '../src/common/seed-directory.js';
import { lineLength, positionAlong, vehiclesAt, walkersAt, workerCollectsVehicles } from '../src/demo/walk.js';
import { routeFileSchema } from '../src/shuttle/shuttle.seed.js';

// 100 m east, then 100 m north, and back: a square's two sides and its diagonal.
const SQUARE = [
  { latitude: 37.46, longitude: 126.95 },
  { latitude: 37.46, longitude: 126.95 + 100 / (111_195 * Math.cos((37.46 * Math.PI) / 180)) },
  { latitude: 37.46 + 100 / 111_195, longitude: 126.95 + 100 / (111_195 * Math.cos((37.46 * Math.PI) / 180)) },
  { latitude: 37.46, longitude: 126.95 },
];

it("finds the demo walker's position a distance along the line", () => {
  const halfway = positionAlong(SQUARE, 50);

  expect(metresBetween(halfway, SQUARE[0] ?? halfway)).toBeCloseTo(50, 0);
  expect(halfway.latitude).toBeCloseTo(37.46, 6);
  expect(positionAlong(SQUARE, 150).longitude).toBeCloseTo(SQUARE[1]?.longitude ?? 0, 6);
});

it('walks round the line again past the end and back past the start', () => {
  const total = lineLength(SQUARE);

  expect(total).toBeCloseTo(200 + 100 * Math.SQRT2, 0);
  expect(positionAlong(SQUARE, total + 50)).toStrictEqual(positionAlong(SQUARE, 50));
  expect(positionAlong(SQUARE, -50).latitude).toBeCloseTo(positionAlong(SQUARE, total - 50).latitude, 9);
});

it('walks the demo Users both ways at a walking pace, inside the Campus Boundary', async () => {
  const { geometry } = await readSeedFile(SEED_DIRECTORY, 'shuttle-route.geojson', routeFileSchema);
  const line = geometry.coordinates.map(([longitude, latitude]) => ({ latitude, longitude }));
  const boundary = await readCampusBoundary(SEED_DIRECTORY);

  const start = walkersAt(line, 0);
  const later = walkersAt(line, 10_000);
  expect(start.map(({ key }) => key)).not.toContain('yejun');
  for (const [index, walker] of start.entries()) {
    const moved = metresBetween(walker.position, later[index]?.position ?? walker.position);
    expect(moved).toBeGreaterThan(5);
    expect(moved).toBeLessThanOrEqual(14.01);
  }
  for (let metres = 0; metres < lineLength(line); metres += 5) {
    expect(boundary.contains(positionAlong(line, metres)), `${metres} m along the line`).toBe(true);
  }
});

it('sends the demo vehicles only outside the hours the worker collects them', () => {
  expect(workerCollectsVehicles(new Date('2026-10-06T10:00:00+09:00'))).toBe(true);
  expect(workerCollectsVehicles(new Date('2026-10-06T21:00:00+09:00'))).toBe(false);
  expect(workerCollectsVehicles(new Date('2026-10-10T10:00:00+09:00'))).toBe(false);
  const stops = [
    { left: 10, top: 10 },
    { left: 20, top: 20 },
    { left: 30, top: 30 },
    { left: 40, top: 40 },
  ];
  expect(vehiclesAt(stops, new Date(0))).toStrictEqual([
    { carId: 'DEMO1', x: 10, y: 15 },
    { carId: 'DEMO2', x: 30, y: 35 },
  ]);
  expect(vehiclesAt(stops, new Date(90_000))[0]).toStrictEqual({ carId: 'DEMO1', x: 20, y: 25 });
});
