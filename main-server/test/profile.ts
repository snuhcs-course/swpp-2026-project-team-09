import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';

export function getProfile(app: INestApplication<Server>, accessToken?: string): request.Test {
  const get = request(app.getHttpServer()).get('/users/me/profile');
  return accessToken === undefined ? get : get.auth(accessToken, { type: 'bearer' });
}

export function patchProfile(
  app: INestApplication<Server>,
  accessToken: string | undefined,
  body: object,
): request.Test {
  const patch = request(app.getHttpServer()).patch('/users/me/profile');
  return (accessToken === undefined ? patch : patch.auth(accessToken, { type: 'bearer' })).send(body);
}
