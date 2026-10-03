import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { Redis } from 'ioredis';
import { z } from 'zod';
import { CollectionService } from '../collection/collection.service.js';
import { MESSAGING_CLIENT } from '../common/messaging.module.js';
import { PrismaService } from '../common/prisma.service.js';
import { REDIS } from '../common/redis.module.js';
import { ShuttleStop, Source } from '../generated/prisma/client.js';
import { ShuttleRouteDto, toShuttleStopDto } from './dto/shuttle-route.dto.js';
import { type ShuttleStopsCollectedMessage } from './dto/shuttle-stops-collected.dto.js';
import { type ShuttleVehicleDto, shuttleVehicleSchema } from './dto/shuttle-vehicle.dto.js';
import { type ShuttleVehiclesCollectedMessage } from './dto/shuttle-vehicles-collected.dto.js';
import { ROUTE_NUMBER } from './shuttle.seed.js';

// The Redis key of the latest set of vehicles, as it is served. A state replaced every 15 seconds and gone after a
// minute, so no table holds it.
const VEHICLES_KEY = 'shuttle:vehicles';

// The key expires this long after its set was received, so that the vehicles disappear when the service ends or the
// worker stops.
const POSITION_LIFETIME = 60 * 1000;

// The line as the seed stores it.
const lineSchema = z.array(z.object({ latitude: z.number(), longitude: z.number() }));

// The stop nearest to a position on the drawing. A vehicle at a stop comes 5 px below the stop's top, which never
// changes the nearest: the stops lie at least 50 px apart.
function nearest(stops: ShuttleStop[], x: number, y: number): ShuttleStop {
  const distance = (stop: ShuttleStop): number => Math.hypot(stop.drawingLeft - x, stop.drawingTop - y);
  const [first, ...rest] = stops;
  if (first === undefined) {
    throw new Error('No shuttle stop is loaded');
  }
  return rest.reduce((best, stop) => (distance(stop) < distance(best) ? stop : best), first);
}

@Injectable()
export class ShuttleService {
  private readonly logger = new Logger(ShuttleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly collection: CollectionService,
    @Inject(REDIS) private readonly redis: Redis,
    @Inject(MESSAGING_CLIENT) private readonly messaging: ClientProxy,
  ) {}

  async route(): Promise<ShuttleRouteDto> {
    const route = await this.prisma.shuttleRoute.findUniqueOrThrow({ where: { number: ROUTE_NUMBER } });
    const stops = await this.prisma.shuttleStop.findMany({ orderBy: { loopOrder: 'asc' } });
    return {
      serviceHours: route.serviceHours,
      stops: stops.map((stop) => toShuttleStopDto(stop)),
      line: lineSchema.parse(route.line),
    };
  }

  async vehicles(): Promise<ShuttleVehicleDto[]> {
    const stored = await this.redis.get(VEHICLES_KEY);
    return stored === null ? [] : z.array(shuttleVehicleSchema).parse(JSON.parse(stored));
  }

  // The stops of the page must be those of the seed, in its loop order. Any other list means that the page changed,
  // and a person corrects the seed.
  async storeStops({ collectedAt, stops, serviceHours }: ShuttleStopsCollectedMessage): Promise<void> {
    const seeded = (await this.prisma.shuttleStop.findMany({ orderBy: { loopOrder: 'asc' } })).map(({ name }) => name);
    const names = stops.map(({ name }) => name);
    const unknown = names.filter((name) => !seeded.includes(name));
    if (unknown.length > 0) {
      throw new RpcException(`stops: the seed does not know ${unknown.join(', ')}`);
    }
    if (names.join('\n') !== seeded.join('\n')) {
      throw new RpcException(`stops: not the seed's stops in its loop order, ${seeded.join(', ')}`);
    }
    await this.prisma.$transaction(async (tx) => {
      await this.collection.recordSuccess(tx, Source.shuttle_stops, new Date(collectedAt));
      await Promise.all(
        stops.map(({ name, left, top }) =>
          tx.shuttleStop.updateMany({ where: { name }, data: { drawingLeft: left, drawingTop: top } }),
        ),
      );
      await tx.shuttleRoute.update({ where: { number: ROUTE_NUMBER }, data: { serviceHours } });
    });
  }

  // A set replaces the vehicles as a whole, as the operator's page redraws them on each answer: a vehicle the operator
  // no longer reports is gone at once. In the loop order of their stops.
  async storeVehicles({ collectedAt, vehicles }: ShuttleVehiclesCollectedMessage): Promise<void> {
    const receivedAt = new Date(collectedAt);
    const stops = await this.prisma.shuttleStop.findMany();
    const sent = vehicles
      .map(({ carId, x, y }) => ({ carId, stop: nearest(stops, x, y) }))
      .toSorted((a, b) => a.stop.loopOrder - b.stop.loopOrder || a.carId.localeCompare(b.carId))
      .map(({ carId, stop }): ShuttleVehicleDto => ({
        carId,
        stop: toShuttleStopDto(stop),
        receivedAt: receivedAt.toISOString(),
      }));
    const stored = JSON.stringify(sent);
    const expiresAt = receivedAt.getTime() + POSITION_LIFETIME;
    // Every main server receives the message and stores the same set. The one whose write changed what is served
    // sends it, so that the apps get a set once. A set already more than a minute old leaves nothing to serve.
    const changed =
      expiresAt > Date.now()
        ? (await this.redis.set(VEHICLES_KEY, stored, 'PXAT', expiresAt, 'GET')) !== stored
        : (await this.redis.del(VEHICLES_KEY)) === 1;
    await this.collection.recordSuccess(this.prisma, Source.shuttle_vehicles, receivedAt);
    if (changed) {
      this.messaging.emit('shuttle-vehicles-updated', sent).subscribe({
        error: (error: unknown) => {
          this.logger.warn(`The socket server was not given the shuttle's vehicles: ${String(error)}`);
        },
      });
    }
  }
}
