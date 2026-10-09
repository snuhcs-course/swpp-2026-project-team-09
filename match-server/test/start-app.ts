// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-09-28 to 2026-10-06, prompted by TaeHyun79 and fyoon46, reviewed by fyoon46 and TaeHyun79 in #2 #4 #8 #10 #45 #48
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Server } from 'node:http';
import { Settings } from '../src/common/settings.js';
import { type Grouping } from '../src/matching/grouping.js';
import { FETCH_MAIN_SERVER } from '../src/matching/main-server.js';
import { MainServerStub } from './main-server.js';

// AppModule validates the settings when it is imported, so it is imported afresh after the environment is set.
// `mainServer` answers in the main server's place, and `grouping`, when given, replaces the grouping module.
export async function startApp(
  settings: Partial<Record<keyof Settings, string | undefined>>,
  { mainServer = new MainServerStub(), grouping }: { mainServer?: MainServerStub; grouping?: Grouping } = {},
): Promise<INestApplication<Server>> {
  for (const [name, value] of Object.entries(settings)) {
    vi.stubEnv(name, value);
  }
  vi.resetModules();
  const { AppModule } = await import('../src/app.module.js');
  // Imported after AppModule, so that it is the same class AppModule registers.
  const { Grouping: GroupingToken } = await import('../src/matching/grouping.js');
  let builder = Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(FETCH_MAIN_SERVER)
    .useValue(mainServer.fetch);
  if (grouping !== undefined) {
    builder = builder.overrideProvider(GroupingToken).useValue(grouping);
  }
  const app = (await builder.compile()).createNestApplication<INestApplication<Server>>();
  // On a free port of 127.0.0.1, once. A server that does not listen is started and closed by supertest around each
  // group of requests on a port of every address, which macOS also gives out while another program holds it on
  // 127.0.0.1: now and then a request then reached that program instead.
  await app.listen(0, '127.0.0.1');
  return app;
}
