import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Server } from 'node:http';
import { Settings } from '../src/common/settings.js';

// AppModule validates the settings when it is imported, so it is imported afresh after the environment is set.
// Classes looked up in the app are imported afresh with it, so that they are the classes the app uses.
export async function startApp(
  settings: Readonly<Partial<Record<keyof Settings, string | undefined>>>,
): Promise<INestApplication<Server>> {
  for (const [name, value] of Object.entries(settings)) {
    vi.stubEnv(name, value);
  }
  vi.resetModules();
  const { AppModule } = await import('../src/app.module.js');
  const { MessagingConfigService } = await import('../src/common/messaging-config.service.js');
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<INestApplication<Server>>();
  // Connected to messaging as main.ts does, so that the tests run the server as it runs.
  app.connectMicroservice(app.get(MessagingConfigService).createClientOptions());
  await app.startAllMicroservices();
  await app.init();
  return app;
}
