/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { setTimeout as sleep } from 'node:timers/promises';
import { USER_TOKEN_AUDIENCE } from './auth/access-token.guard.js';
import { readSeedFile, SEED_DIRECTORY } from './common/seed-directory.js';
import { demoSessionId, demoUserId } from './demo/demo.seed.js';
import { vehiclesAt, walkersAt, workerCollectsVehicles } from './demo/walk.js';
import { routeFileSchema, stopsFileSchema } from './shuttle/shuttle.seed.js';

const TICK = 5000;
// As the worker sends the operator's vehicles.
const VEHICLES_EVERY = 3;

function setting(name: string): string {
  const value = process.env[name];
  if (value === undefined) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

// The demo profile's walker (README.md: Demo data): `pnpm demo:walk` uploads the demo Users' positions every 5 seconds
// as their phones would, with access tokens signed for their Sessions, and the demo vehicles while the worker does not
// collect the operator's.
async function demoWalk(): Promise<void> {
  const logger = new Logger('DemoWalk');
  const mainServer = process.env['MAIN_SERVER_URL'] ?? `http://localhost:${process.env['PORT'] ?? '3000'}`;
  const workerToken = setting('WORKER_TOKEN');
  const jwt = new JwtService({
    privateKey: setting('ACCESS_TOKEN_PRIVATE_KEY'),
    signOptions: { algorithm: 'ES256', audience: USER_TOKEN_AUDIENCE, expiresIn: '1h' },
  });
  const line = (await readSeedFile(SEED_DIRECTORY, 'shuttle-route.geojson', routeFileSchema)).geometry.coordinates.map(
    ([longitude, latitude]) => ({ latitude, longitude }),
  );
  const { stops } = await readSeedFile(SEED_DIRECTORY, 'shuttle-stops.json', stopsFileSchema);
  const post = async (path: string, token: string, body: object): Promise<void> => {
    try {
      const response = await fetch(new URL(path, mainServer), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TICK),
      });
      if (!response.ok) {
        logger.warn(`${path} answered ${response.status}: ${await response.text()}`);
      }
    } catch (error) {
      logger.warn(`${path} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  const started = Date.now();
  logger.log(`Walking the demo Users on ${mainServer}`);
  for (let tick = 0; ; tick += 1) {
    const now = new Date();
    const uploads = walkersAt(line, now.getTime() - started).map(async ({ key, position }) => {
      const token = await jwt.signAsync({ sub: demoUserId(key), sid: demoSessionId(key) });
      await post('/positions', token, { ...position, accuracy: 10, measuredAt: now.toISOString() });
    });
    if (tick % VEHICLES_EVERY === 0 && !workerCollectsVehicles(now)) {
      uploads.push(
        post('/shuttle/vehicles/collected', workerToken, {
          source: 'shuttle_vehicles',
          collectedAt: now.toISOString(),
          vehicles: vehiclesAt(stops, now),
        }),
      );
    }
    // oxlint-disable-next-line no-await-in-loop -- one round every 5 seconds
    await Promise.all([...uploads, sleep(TICK)]);
  }
}
await demoWalk();
