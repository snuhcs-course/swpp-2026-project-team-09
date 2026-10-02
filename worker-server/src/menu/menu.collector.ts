import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Cron } from '@nestjs/schedule';
import { lastValueFrom } from 'rxjs';
import { MESSAGING_CLIENT } from '../common/messaging.module.js';
import { PageFetcher } from '../common/page-fetcher.js';
import { MENU_SOURCES, type MenuDay, type MenuSource, type MenusCollectedMessage } from './dto/menus-collected.dto.js';
import { parseMenuPage } from './menu-page.parser.js';
import { parseVeterinaryMenuPage } from './veterinary-menu-page.parser.js';

// 05:00 and 10:00. Provisional, until someone has observed when the pages change.
const COLLECTION_TIMES = '0 0 5,10 * * *';

// A Collection covers today and the six days after. Restaurants fill in their later days as they post them.
const COLLECTED_DAYS = 7;

const HOUR = 60 * 60 * 1000;

// The calendar day in Asia/Seoul, which is UTC+9 all year, `days` after `time`.
function seoulDay(time: Date, days: number): string {
  return new Date(time.getTime() + (9 + 24 * days) * HOUR).toISOString().slice(0, 10);
}

@Injectable()
export class MenuCollector {
  private readonly logger = new Logger(MenuCollector.name);

  constructor(
    private readonly pages: PageFetcher,
    @Inject(MESSAGING_CLIENT) private readonly mainServer: ClientProxy,
  ) {}

  @Cron(COLLECTION_TIMES, { timeZone: 'Asia/Seoul' })
  async collect(): Promise<void> {
    await Promise.all(MENU_SOURCES.map((source) => this.collectOne(source)));
  }

  // One Collection of a Source. Gives whether the main server took what was read.
  collectOne(source: MenuSource): Promise<boolean> {
    const now = new Date();
    const dates = Array.from({ length: COLLECTED_DAYS }, (_, days) => seoulDay(now, days));
    const read = {
      coop_menus: (): Promise<MenuDay[]> => this.readCoopPages(dates),
      dormitory_menus: (): Promise<MenuDay[]> => this.readDailyPages('https://snudorm.snu.ac.kr/foodmenu/', dates),
      veterinary_menus: (): Promise<MenuDay[]> => this.readWeekPage(dates),
    };
    return this.handOver(source, now, read[source]());
  }

  // The restaurants whose names start with "* " repeat one fixed menu in every cell, every day. 기숙사식당 is the
  // dormitory page's 생협기숙사(919동), and is taken from there.
  private async readCoopPages(dates: string[]): Promise<MenuDay[]> {
    const days = await this.readDailyPages('https://snuco.snu.ac.kr/foodmenu/', dates);
    return days.map(({ date, restaurants }) => ({
      date,
      restaurants: restaurants.filter(({ name }) => !name.startsWith('* ') && name !== '기숙사식당'),
    }));
  }

  // The Co-op's and the dormitory's page take a date.
  private readDailyPages(address: string, dates: string[]): Promise<MenuDay[]> {
    return Promise.all(
      dates.map(async (date) => ({
        date,
        restaurants: parseMenuPage(await this.pages.fetch(`${address}?date=${date}`), date),
      })),
    );
  }

  private async readWeekPage(dates: string[]): Promise<MenuDay[]> {
    return parseVeterinaryMenuPage(await this.pages.fetch('https://vet.snu.ac.kr/cafe_menu/'), dates);
  }

  // Ends one Collection of a Source: what it read goes to the main server, and so does a failure to fetch or read it.
  private async handOver(source: MenuSource, collectedAt: Date, days: Promise<MenuDay[]>): Promise<boolean> {
    try {
      const message: MenusCollectedMessage = { source, collectedAt: collectedAt.toISOString(), days: await days };
      await this.send('menus-collected', message);
      return true;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`The Collection of ${source} failed: ${reason}`);
      await this.send('collection-failed', { source, failedAt: collectedAt.toISOString(), reason });
      return false;
    }
  }

  private async send(pattern: string, message: object): Promise<void> {
    try {
      await lastValueFrom(this.mainServer.send(pattern, message));
    } catch (answer) {
      // A refusal arrives as the main server's answer, { status: 'error', message }, not as an Error.
      const problem =
        typeof answer === 'object' && answer !== null && 'message' in answer ? String(answer.message) : String(answer);
      throw new Error(`The main server did not take ${pattern}: ${problem}`, { cause: answer });
    }
  }
}
