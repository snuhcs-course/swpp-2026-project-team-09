import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Server } from 'node:http';
import { MESSAGING_CLIENT } from '../src/common/messaging.module.js';
import { FETCH } from '../src/common/page-fetcher.js';
import { Settings } from '../src/common/settings.js';
import { MainServerStub } from './main-server.js';

function refuseEveryRequest(): Promise<Response> {
  return Promise.reject(new Error('The tests never call the real sites'));
}

// AppModule validates the settings when it is imported, so it is imported afresh after the environment is set.
// Page requests go to `fetchPage` in place of the real sites; without one, every request fails. `mainServer` takes the
// worker's messages in place of messaging over Redis.
export async function startApp(
  settings: Partial<Record<keyof Settings, string | undefined>>,
  { fetchPage = refuseEveryRequest, mainServer }: { fetchPage?: typeof fetch; mainServer?: MainServerStub } = {},
): Promise<INestApplication<Server>> {
  for (const [name, value] of Object.entries(settings)) {
    vi.stubEnv(name, value);
  }
  vi.resetModules();
  const { AppModule } = await import('../src/app.module.js');
  const builder = Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(FETCH)
    .useValue(fetchPage);
  if (mainServer !== undefined) {
    builder.overrideProvider(MESSAGING_CLIENT).useValue(mainServer);
  }
  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication<INestApplication<Server>>();
  await app.init();
  return app;
}
