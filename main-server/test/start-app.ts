/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-28  Opus 5.5   prompted by TaeHyun79
 * 2026-09-29  Opus 5.5   prompted by TaeHyun79
 * 2026-09-29  Opus 5.5   prompted by fyoon46
 * 2026-10-02  Opus 5.5   prompted by TaeHyun79
 * 2026-10-03  Opus 5.5   prompted by fyoon46
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { DynamicModule, INestApplication, Type } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { Server } from 'node:http';
import { MODEL_PORT, type Model } from '../src/assistant/adapter.js';
import { httpAdapter } from '../src/common/http-adapter.js';
import { JSON_BODY_LIMIT } from '../src/common/json-body-limit.js';
import { Settings } from '../src/common/settings.js';
import { FETCH_MATCH_SERVER } from '../src/matching/match-server.js';
import { FETCH_KAKAO } from '../src/walking-route/walking-route.service.js';
import { TestGoogleIdTokenVerifier } from './google.js';
import { refuseMatchServer } from './match-server.js';
import { ScriptedModel } from './scripted-model.js';
import { refuseKakao } from './walking-route.js';

// AppModule validates the settings when it is imported, so it is imported afresh after the environment is set.
// The test verifier accepts ID tokens from test/google.ts, `fetchKakao` answers in Kakao's place, `fetchMatchServer`
// in the match server's and `model` in the Assistant's model's: by default a ScriptedModel without a script, which
// fails every call.
// `controllers` adds controllers that exist only in the tests, such as handlers that no feature has yet, and `modules`
// modules that only the tests or the benchmark import, such as the one binding the benchmark's run observer.
export async function startApp(
  settings: Partial<Record<keyof Settings, string | undefined>>,
  controllers: Type[] = [],
  fetchKakao: typeof fetch = refuseKakao,
  fetchMatchServer: typeof fetch = refuseMatchServer,
  model: Model = new ScriptedModel().model,
  modules: (Type | DynamicModule)[] = [],
): Promise<INestApplication<Server>> {
  for (const [name, value] of Object.entries(settings)) {
    vi.stubEnv(name, value);
  }
  vi.resetModules();
  const { AppModule } = await import('../src/app.module.js');
  // Imported after AppModule, so that it is the same class AppModule registers.
  const { GoogleIdTokenVerifier } = await import('../src/auth/google-id-token.verifier.js');
  const moduleRef = await Test.createTestingModule({ imports: [AppModule, ...modules], controllers })
    .overrideProvider(GoogleIdTokenVerifier)
    .useClass(TestGoogleIdTokenVerifier)
    .overrideProvider(FETCH_KAKAO)
    .useValue(fetchKakao)
    .overrideProvider(FETCH_MATCH_SERVER)
    .useValue(fetchMatchServer)
    .overrideProvider(MODEL_PORT)
    .useValue(model)
    .compile();
  // As src/main.ts does.
  const app = moduleRef.createNestApplication<NestExpressApplication>(httpAdapter());
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
