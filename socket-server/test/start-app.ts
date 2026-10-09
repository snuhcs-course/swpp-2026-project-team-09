// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-09-28 to 2026-10-06, prompted by TaeHyun79 and fyoon46, reviewed by fyoon46 and TaeHyun79 in #2 #4 #6 #10
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { Server } from 'node:http';
import { messagingOptions } from '../src/common/messaging.js';
import { Settings } from '../src/common/settings.js';

// AppModule validates the settings when it is imported, so it is imported afresh after the environment is set.
export async function startApp(
  settings: Partial<Record<keyof Settings, string | undefined>>,
): Promise<INestApplication<Server>> {
  for (const [name, value] of Object.entries(settings)) {
    vi.stubEnv(name, value);
  }
  vi.resetModules();
  const { AppModule } = await import('../src/app.module.js');
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<INestApplication<Server>>();
  // Started as main.ts starts it, so that the tests run the server as it runs.
  app.connectMicroservice(messagingOptions(app.get<ConfigService<Settings, true>>(ConfigService)));
  try {
    await app.init();
    await app.startAllMicroservices();
    // On a free port of 127.0.0.1, once. A server that does not listen is started and closed by supertest around each
    // group of requests on a port of every address, which macOS also gives out while another program holds it on
    // 127.0.0.1: now and then a request then reached that program instead.
    await app.listen(0, '127.0.0.1');
  } catch (error) {
    // Close what already started, such as a messaging connection that would keep retrying.
    await app.close();
    throw error;
  }
  return app;
}
