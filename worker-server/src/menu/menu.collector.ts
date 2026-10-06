import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Collector, Collects } from '../common/collector.js';
import { PageFetcher } from '../common/page-fetcher.js';
import { seoulDay } from '../common/seoul-day.js';
import {
  MENU_SOURCES,
  type MenuDay,
  type MenuSource,
  type MenusCollectedMessage,
  type RestaurantMenu,
} from './dto/menus-collected.dto.js';
import { parseMenuPage } from './menu-page.parser.js';
import { parseVeterinaryMenuPage } from './veterinary-menu-page.parser.js';

// 05:00 and 10:00. Provisional, until someone has observed when the pages change.
const COLLECTION_TIMES = '0 0 5,10 * * *';

// A Collection covers today and the six days after. Restaurants fill in their later days as they post them.
const COLLECTED_DAYS = 7;

// The restaurants whose names start with "* " repeat one fixed menu in every cell, every day. 기숙사식당 is the
// dormitory page's 생협기숙사(919동), and is taken from there.
export function coopRestaurants(restaurants: RestaurantMenu[]): RestaurantMenu[] {
  return restaurants.filter(({ name }) => !name.startsWith('* ') && name !== '기숙사식당');
}

@Injectable()
@Collects(MENU_SOURCES)
export class MenuCollector extends Collector {
  constructor(private readonly pages: PageFetcher) {
    super();
  }

  @Cron(COLLECTION_TIMES, { timeZone: 'Asia/Seoul' })
  async collect(): Promise<void> {
    await Promise.all(MENU_SOURCES.map((source) => this.collectOne(source)));
  }

  collectOne(source: MenuSource): Promise<boolean> {
    const now = new Date();
    const dates = Array.from({ length: COLLECTED_DAYS }, (_, days) => seoulDay(now, days));
    const read = {
      coop_menus: (): Promise<MenuDay[]> => this.readCoopPages(dates),
      dormitory_menus: (): Promise<MenuDay[]> => this.readDailyPages('https://snudorm.snu.ac.kr/foodmenu/', dates),
      veterinary_menus: (): Promise<MenuDay[]> => this.readWeekPage(dates),
    };
    const message = async (): Promise<MenusCollectedMessage> => ({
      source,
      collectedAt: now.toISOString(),
      days: await read[source](),
    });
    return this.handOver(source, now, '/menus/collected', message());
  }

  private async readCoopPages(dates: string[]): Promise<MenuDay[]> {
    const days = await this.readDailyPages('https://snuco.snu.ac.kr/foodmenu/', dates);
    return days.map(({ date, restaurants }) => ({ date, restaurants: coopRestaurants(restaurants) }));
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
}
