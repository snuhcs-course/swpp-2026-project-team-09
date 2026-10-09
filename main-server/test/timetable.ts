// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-10-06, prompted by fyoon46, reviewed by TaeHyun79 in #37
import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import request from 'supertest';
import { z } from 'zod';

// A class as the routes serve it, exactly.
const timetableClassSchema = z.strictObject({
  id: z.uuid(),
  courseName: z.string(),
  times: z.array(
    z.strictObject({
      id: z.uuid(),
      weekday: z.string(),
      startTime: z.string(),
      endTime: z.string(),
      placeId: z.uuid().nullable(),
      room: z.string().nullable(),
    }),
  ),
  overlaps: z.array(z.strictObject({ id: z.uuid(), courseName: z.string() })),
});

export type TimetableClass = z.infer<typeof timetableClassSchema>;

export function getClasses(app: INestApplication<Server>, accessToken: string): request.Test {
  return request(app.getHttpServer()).get('/timetable/classes').auth(accessToken, { type: 'bearer' });
}

export async function classesOf(app: INestApplication<Server>, accessToken: string): Promise<TimetableClass[]> {
  const response = await getClasses(app, accessToken);
  expect(response.status).toBe(200);
  return z.array(timetableClassSchema).parse(response.body);
}

// With a new Idempotency-Key unless one is given, as the app sends it.
export function postClass(
  app: INestApplication<Server>,
  accessToken: string,
  body: object,
  key: string | null = randomUUID(),
): request.Test {
  const sent = request(app.getHttpServer()).post('/timetable/classes').auth(accessToken, { type: 'bearer' });
  return (key === null ? sent : sent.set('Idempotency-Key', key)).send(body);
}

export async function addClass(
  app: INestApplication<Server>,
  accessToken: string,
  body: object,
): Promise<TimetableClass> {
  const response = await postClass(app, accessToken, body);
  expect(response.status).toBe(201);
  return timetableClassSchema.parse(response.body);
}

export function putClass(app: INestApplication<Server>, accessToken: string, id: string, body: object): request.Test {
  return request(app.getHttpServer()).put(`/timetable/classes/${id}`).auth(accessToken, { type: 'bearer' }).send(body);
}

export async function replaceClass(
  app: INestApplication<Server>,
  accessToken: string,
  id: string,
  body: object,
): Promise<TimetableClass> {
  const response = await putClass(app, accessToken, id, body);
  expect(response.status).toBe(200);
  return timetableClassSchema.parse(response.body);
}

export function deleteClass(app: INestApplication<Server>, accessToken: string, id: string): request.Test {
  return request(app.getHttpServer()).delete(`/timetable/classes/${id}`).auth(accessToken, { type: 'bearer' });
}

export function resetTimetable(app: INestApplication<Server>, accessToken: string): request.Test {
  return request(app.getHttpServer()).delete('/timetable/classes').auth(accessToken, { type: 'bearer' });
}

// A time as the app sends it, with the fields given in place of the sample's.
export function aTime(placeId: string | null, fields: object = {}): object {
  return { weekday: 'tuesday', startTime: '09:30', endTime: '10:45', placeId, room: '101호', ...fields };
}

// A class as the app sends it, held on Tuesday and Thursday at the same times.
export function aClass(placeId: string | null, fields: object = {}): object {
  return {
    courseName: '데이터베이스',
    times: [aTime(placeId), aTime(placeId, { weekday: 'thursday' })],
    ...fields,
  };
}

// The class as it is answered, without the identifiers the server gives.
export function withoutIds({ courseName, times }: TimetableClass): object {
  return { courseName, times: times.map(({ id: _id, ...time }) => time) };
}

// Two Places of the list, which the global setup loaded.
export async function twoPlaceIds(app: INestApplication<Server>, accessToken: string): Promise<[string, string]> {
  const response = await request(app.getHttpServer()).get('/places').auth(accessToken, { type: 'bearer' });
  const [first, second] = z
    .array(z.object({ id: z.string() }))
    .min(2)
    .parse(response.body);
  return [first.id, second.id];
}
