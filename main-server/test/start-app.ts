/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-28  Opus 5.5   prompted by TaeHyun79
 * 2026-09-29  Opus 5.5   prompted by TaeHyun79
 * 2026-09-29  Opus 5.5   prompted by fyoon46
 * 2026-10-02  Opus 5.5   prompted by TaeHyun79
 * 2026-10-03  Opus 5.5   prompted by fyoon46
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication, Type } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { Server } from 'node:http';
import { JSON_BODY_LIMIT } from '../src/common/json-body-limit.js';
import { Settings } from '../src/common/settings.js';
import { FETCH_MATCH_SERVER } from '../src/matching/match-server.js';
import { FETCH_KAKAO } from '../src/walking-route/walking-route.service.js';
import { TestGoogleIdTokenVerifier } from './google.js';
import { refuseMatchServer } from './match-server.js';
import { refuseKakao } from './walking-route.js';

// AppModule validates the settings when it is imported, so it is imported afresh after the environment is set.
// The test verifier accepts ID tokens from test/google.ts, `fetchKakao` answers in Kakao's place and `fetchMatchServer`
// in the match server's.
// `controllers` adds controllers that exist only in the tests, such as handlers that no feature has yet.
export async function startApp(
  settings: Partial<Record<keyof Settings, string | undefined>>,
  controllers: Type[] = [],
  fetchKakao: typeof fetch = refuseKakao,
  fetchMatchServer: typeof fetch = refuseMatchServer,
): Promise<INestApplication<Server>> {
  for (const [name, value] of Object.entries(settings)) {
    vi.stubEnv(name, value);
  }
  vi.resetModules();
  const { AppModule } = await import('../src/app.module.js');
  // Imported after AppModule, so that it is the same class AppModule registers.
  const { GoogleIdTokenVerifier } = await import('../src/auth/google-id-token.verifier.js');
  const moduleRef = await Test.createTestingModule({ imports: [AppModule], controllers })
    .overrideProvider(GoogleIdTokenVerifier)
    .useClass(TestGoogleIdTokenVerifier)
    .overrideProvider(FETCH_KAKAO)
    .useValue(fetchKakao)
    .overrideProvider(FETCH_MATCH_SERVER)
    .useValue(fetchMatchServer)
    .compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();
  // As src/main.ts does.
  app.useBodyParser('json', { limit: JSON_BODY_LIMIT });
  try {
    // On a free port, once. A server that does not listen is started and closed by supertest around each group of
    // requests, on a new port each time, and now and then a request reached something else or hung up.
    await app.listen(0, '127.0.0.1');
  } catch (error) {
    // Close what already started, such as a messaging connection that would keep retrying.
    await app.close();
    throw error;
  }
  return app;
}
