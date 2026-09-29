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
  } catch (error) {
    // Close what already started, such as a messaging connection that would keep retrying.
    await app.close();
    throw error;
  }
  return app;
}
