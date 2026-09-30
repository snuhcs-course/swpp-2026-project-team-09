import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';

// The days of `month` ('2026-11'), one per call. Each test file takes a month of its own and each test a day of its
// own, because the files share the database and a day's answer holds every restaurant stored for it.
export function daysOf(month: string): () => string {
  let day = 0;
  return (): string => {
    day += 1;
    return `${month}-${String(day).padStart(2, '0')}`;
  };
}

// One restaurant's menus on `date`, as a collector reads them, with `changes` applied.
export function restaurantMenus(date: string, changes: object = {}): object {
  return {
    restaurant: '학생회관식당',
    date,
    operatingHours: '※ 운영시간 : 11:00~14:30',
    entries: [{ meal: 'lunch', name: '제육볶음', price: 6000 }],
    ...changes,
  };
}

// A menus message from the Co-op collector, with `changes` applied.
export function menusMessage(menus: object[], changes: object = {}): object {
  return { source: 'coop_menus', collectedAt: '2026-10-31T21:00:00+09:00', menus, ...changes };
}

export function getMenus(app: INestApplication<Server>, accessToken: string, date: string): request.Test {
  return request(app.getHttpServer()).get('/menus').query({ date }).auth(accessToken, { type: 'bearer' });
}
