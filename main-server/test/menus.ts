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

// A restaurant as a collector reads it from a page, with `changes` applied.
export function restaurant(changes: object = {}): object {
  return {
    name: '학생회관식당',
    lines: [
      { meal: 'lunch', text: '제육볶음 : 6,000원', kind: 'dish', price: 6000 },
      { meal: 'lunch', text: '※ 운영시간 : 11:00~14:30', kind: 'note', price: null },
    ],
    ...changes,
  };
}

// The lunch of `restaurant()` as the route serves it.
export const servedLunch = {
  meal: 'lunch',
  lines: [
    { text: '제육볶음 : 6,000원', kind: 'dish', price: 6000 },
    { text: '※ 운영시간 : 11:00~14:30', kind: 'note', price: null },
  ],
};

// A menus message from the Co-op collector, with `changes` applied.
export function menusMessage(days: { date: string; restaurants: object[] }[], changes: object = {}): object {
  return { source: 'coop_menus', collectedAt: '2026-10-31T21:00:00+09:00', days, ...changes };
}

export function getMenus(app: INestApplication<Server>, accessToken: string, date: string): request.Test {
  return request(app.getHttpServer()).get('/menus').query({ date }).auth(accessToken, { type: 'bearer' });
}
