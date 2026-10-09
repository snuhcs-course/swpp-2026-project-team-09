// AI-generated with Claude Opus 5.5, 2026-10-03, prompted by TaeHyun79, reviewed by fyoon46 in #29
import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { startApp } from './start-app.js';

describe('The Campus Boundary', () => {
  let app: INestApplication<Server>;

  beforeAll(async () => {
    app = await startApp(inject('settings'));
  });

  afterAll(async () => {
    await app.close();
  });

  it('is read when the server starts and holds a position on campus but not one off it', async () => {
    // Imported after startApp, so that it is the class the server registered.
    const { CampusBoundary } = await import('../src/common/campus-boundary.js');
    const boundary = app.get(CampusBoundary);

    // 중앙도서관 본관, and 교수아파트1 in the wedge that the outline leaves out in the north-east, as the campus map
    // places them.
    expect(boundary.contains({ latitude: 37.4594, longitude: 126.95199 })).toBe(true);
    expect(boundary.contains({ latitude: 37.46709, longitude: 126.95717 })).toBe(false);
  });

  it('also holds a position 5 m outside its outline, but not one 15 m outside', async () => {
    const { CampusBoundary } = await import('../src/common/campus-boundary.js');
    const boundary = app.get(CampusBoundary);

    // West of the middle of the outline's longest edge, on the campus's west side, at right angles to the edge.
    expect(boundary.contains({ latitude: 37.4586959, longitude: 126.947596 })).toBe(true);
    expect(boundary.contains({ latitude: 37.458677, longitude: 126.9474852 })).toBe(false);
  });
});
