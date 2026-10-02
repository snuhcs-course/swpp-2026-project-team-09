import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Collector, Collects } from '../common/collector.js';
import { PageFetcher } from '../common/page-fetcher.js';
import { type ShuttleStopsCollectedMessage } from './dto/shuttle-stops-collected.dto.js';
import { type ShuttleVehiclesCollectedMessage } from './dto/shuttle-vehicles-collected.dto.js';
import { parseRoutePage } from './route-page.parser.js';
import { parseVehiclePositions } from './vehicle-positions.parser.js';

// 07:00, before the service starts.
const STOPS_TIMES = '0 0 7 * * *';

// Every 15 seconds on weekdays from 08:00 to 20:59:45, the service hours of the semester.
const VEHICLES_TIMES = '*/15 * 8-20 * * 1-5';

// The circular route 41946.
const ROUTE_PAGE = 'https://web.busin.co.kr/BuslineCircleS.aspx?cd=snu_1&di=41946&tab=F';
const VEHICLE_POSITIONS = 'https://web.busin.co.kr/BuslineCircleS.aspx/GetRoute';
// What the route page itself sends for the route's vehicles.
const VEHICLES_REQUEST = { data: ',F,41946,snu_1' };

export const SHUTTLE_SOURCES = ['shuttle_stops', 'shuttle_vehicles'] as const;

export type ShuttleSource = (typeof SHUTTLE_SOURCES)[number];

@Injectable()
@Collects(SHUTTLE_SOURCES)
export class ShuttleCollector extends Collector {
  constructor(private readonly pages: PageFetcher) {
    super();
  }

  @Cron(STOPS_TIMES, { timeZone: 'Asia/Seoul' })
  async collectStops(): Promise<void> {
    await this.collectOne('shuttle_stops');
  }

  // A run that waits behind other pages, or for a main server that is down, makes the next ones skip, so that the
  // requests do not pile up and go out together.
  @Cron(VEHICLES_TIMES, { timeZone: 'Asia/Seoul', waitForCompletion: true })
  async collectVehicles(): Promise<void> {
    await this.collectOne('shuttle_vehicles');
  }

  collectOne(source: ShuttleSource): Promise<boolean> {
    const now = new Date();
    const collect = {
      shuttle_stops: (): Promise<boolean> =>
        this.handOver(source, now, 'shuttle-stops-collected', this.readRoutePage(now)),
      shuttle_vehicles: (): Promise<boolean> =>
        this.handOver(source, now, 'shuttle-vehicles-collected', this.readVehiclePositions()),
    };
    return collect[source]();
  }

  private async readRoutePage(now: Date): Promise<ShuttleStopsCollectedMessage> {
    const { stops, serviceHours } = parseRoutePage(await this.pages.fetch(ROUTE_PAGE));
    return { source: 'shuttle_stops', collectedAt: now.toISOString(), stops, serviceHours };
  }

  // The answer carries no time of its own, so the positions are as old as its arrival.
  private async readVehiclePositions(): Promise<ShuttleVehiclesCollectedMessage> {
    const answer = await this.pages.fetch(VEHICLE_POSITIONS, VEHICLES_REQUEST);
    return {
      source: 'shuttle_vehicles',
      collectedAt: new Date().toISOString(),
      vehicles: parseVehiclePositions(answer),
    };
  }
}
