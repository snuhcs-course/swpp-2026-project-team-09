// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-09-28 to 2026-10-06, prompted by TaeHyun79 and fyoon46, reviewed by fyoon46 and TaeHyun79 in #2 #4 #6 #7 #10 #26 #31
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Server } from 'node:http';
import { FETCH_MAIN_SERVER } from '../src/common/main-server.js';
import { FETCH } from '../src/common/page-fetcher.js';
import { Settings } from '../src/common/settings.js';
import { MainServerStub } from './main-server.js';

function refuseEveryRequest(): Promise<Response> {
  return Promise.reject(new Error('The tests never call a real Source'));
}

// AppModule validates the settings when it is imported, so it is imported afresh after the environment is set.
// Page requests go to `fetchPage` in place of the real Sources; without one, every request fails. `mainServer` takes
// the worker's messages in place of the main server.
export async function startApp(
  settings: Partial<Record<keyof Settings, string | undefined>>,
  {
    fetchPage = refuseEveryRequest,
    mainServer = new MainServerStub(),
  }: { fetchPage?: typeof fetch; mainServer?: MainServerStub } = {},
): Promise<INestApplication<Server>> {
  for (const [name, value] of Object.entries(settings)) {
    vi.stubEnv(name, value);
  }
  vi.resetModules();
  const { AppModule } = await import('../src/app.module.js');
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(FETCH)
    .useValue(fetchPage)
    .overrideProvider(FETCH_MAIN_SERVER)
    .useValue(mainServer.fetch)
    .compile();
  const app = moduleRef.createNestApplication<INestApplication<Server>>();
  // On a free port of 127.0.0.1, once. A server that does not listen is started and closed by supertest around each
  // group of requests on a port of every address, which macOS also gives out while another program holds it on
  // 127.0.0.1: now and then a request then reached that program instead.
  await app.listen(0, '127.0.0.1');
  return app;
}
