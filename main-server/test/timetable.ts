import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import request from 'supertest';
import { z } from 'zod';

// A class as the routes serve it, exactly.
const timetableClassSchema = z.strictObject({
  id: z.uuid(),
  courseName: z.string(),
  weekdays: z.array(z.string()),
  startTime: z.string(),
  endTime: z.string(),
  placeId: z.uuid(),
  room: z.string().nullable(),
  overlaps: z.array(z.strictObject({ id: z.uuid(), courseName: z.string() })),
});

type TimetableClass = z.infer<typeof timetableClassSchema>;

// A timetable as `GET /timetable` serves it, exactly.
const timetableSchema = z.strictObject({
  semesterFirstDay: z.iso.date().nullable(),
  semesterLastDay: z.iso.date().nullable(),
  classes: z.array(timetableClassSchema),
});

type Timetable = z.infer<typeof timetableSchema>;

function getTimetable(app: INestApplication<Server>, accessToken: string): request.Test {
  return request(app.getHttpServer()).get('/timetable').auth(accessToken, { type: 'bearer' });
}

export async function timetableOf(app: INestApplication<Server>, accessToken: string): Promise<Timetable> {
  const response = await getTimetable(app, accessToken);
  expect(response.status).toBe(200);
  return timetableSchema.parse(response.body);
}

export function patchTimetable(app: INestApplication<Server>, accessToken: string, body: object): request.Test {
  return request(app.getHttpServer()).patch('/timetable').auth(accessToken, { type: 'bearer' }).send(body);
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

export function deleteClass(app: INestApplication<Server>, accessToken: string, id: string): request.Test {
  return request(app.getHttpServer()).delete(`/timetable/classes/${id}`).auth(accessToken, { type: 'bearer' });
}

// A class as the app sends it, with the fields given in place of the sample's.
export function aClass(placeId: string, fields: object = {}): object {
  return {
    courseName: '데이터베이스',
    weekdays: ['tuesday', 'thursday'],
    startTime: '09:30',
    endTime: '10:45',
    placeId,
    room: '101호',
    ...fields,
  };
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
