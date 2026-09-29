import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Server } from 'node:http';
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
  await app.init();
  return app;
}
