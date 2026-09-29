import { INestApplication, Type } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { Server } from 'node:http';
import { messagingOptions } from '../src/common/messaging.js';
import { Settings } from '../src/common/settings.js';
import { TestGoogleIdTokenVerifier } from './google.js';

// AppModule validates the settings when it is imported, so it is imported afresh after the environment is set.
// Google's token verification is the one part replaced: the test verifier accepts ID tokens from test/google.ts.
// `controllers` adds controllers that exist only in the tests, such as handlers that no feature has yet.
export async function startApp(
  settings: Partial<Record<keyof Settings, string | undefined>>,
  controllers: Type[] = [],
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
    .compile();
  const app = moduleRef.createNestApplication<INestApplication<Server>>();
  // Started as main.ts starts it, so that the tests run the server as it runs.
  app.connectMicroservice(messagingOptions(app.get<ConfigService<Settings, true>>(ConfigService)));
  try {
    await app.init();
    await app.startAllMicroservices();
    // On a free port, once. A server that does not listen is started and closed by supertest around each group of
    // requests, on a new port each time, and a request then and again reached something else or hung up.
    await app.listen(0, '127.0.0.1');
  } catch (error) {
    // Close what already started, such as a messaging connection that would keep retrying.
    await app.close();
    throw error;
  }
  return app;
}
