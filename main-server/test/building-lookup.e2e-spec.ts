import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { type BuildingLookup } from '../src/buildings/building-lookup.js';
import { startApp } from './start-app.js';

// The global setup loaded the seed into the shared database, and the server reads the buildings when it starts.

let app: INestApplication<Server>;
let lookup: BuildingLookup;

beforeAll(async () => {
  app = await startApp(inject('settings'));
  // Imported after startApp, so that it is the class the server registered.
  const { BuildingLookup: registered } = await import('../src/buildings/building-lookup.js');
  lookup = app.get(registered);
});

afterAll(async () => {
  await app.close();
});

describe('The building at a position', () => {
  it('is the building whose outline holds the position', () => {
    // 제1공학관, at the position the campus map gives it.
    expect(lookup.at({ latitude: 37.45016, longitude: 126.95259 })).toMatchObject({
      building: { number: '301', name: '제1공학관' },
      relation: 'inside',
    });
  });

  // The next three positions lie east of the middle of 제1공학관's long east wall, at right angles to it. The ground
  // beyond the wall is clear: the next building is over 50 m away.
  it('is still that building up to 5 m outside its wall, where a phone inside is often placed', () => {
    expect(lookup.at({ latitude: 37.4501215, longitude: 126.9526467 })).toMatchObject({
      building: { number: '301' },
      relation: 'inside',
    });
  });

  it('is a building nearby up to 20 m from its wall', () => {
    expect(lookup.at({ latitude: 37.4501184, longitude: 126.9527485 })).toMatchObject({
      building: { number: '301' },
      relation: 'near',
    });
  });

  it('is none when every building is farther than 20 m', () => {
    expect(lookup.at({ latitude: 37.4501123, longitude: 126.9529523 })).toBeNull();
  });

  it('is a place or a building without an outline only nearby, within 20 m of its position', () => {
    // 자하연, a pond, and 문화관, which OpenStreetMap does not draw, each at the position the campus map gives it.
    expect(lookup.at({ latitude: 37.4607006780578, longitude: 126.952103365166 })).toMatchObject({
      building: { number: null, name: '자하연' },
      relation: 'near',
    });
    expect(lookup.at({ latitude: 37.46159, longitude: 126.95104 })).toMatchObject({
      building: { number: '73', name: '문화관' },
      relation: 'near',
    });
  });
});

describe('The building at a position between buildings', () => {
  it('is the building that holds the position, though the wall of another is within 5 m', () => {
    // 2 m inside 교직원아파트, 5 m from the wall of 가족생활관4.
    expect(lookup.at({ latitude: 37.4669568, longitude: 126.9595258 })).toMatchObject({
      building: { number: '936' },
      relation: 'inside',
    });
  });

  it('is the building whose wall is nearer, between two buildings that both are within 5 m', () => {
    // 1.5 m outside 교직원아파트 and 3 m from 가족생활관4, which comes before it in the list.
    expect(lookup.at({ latitude: 37.4669456, longitude: 126.9594887 })).toMatchObject({
      building: { number: '936' },
      relation: 'inside',
    });
  });

  it('is, of the buildings that share one outline, the one whose position is nearest', () => {
    // 국제대학원, 국제대학원2 and 국제회의동, which OpenStreetMap draws as one building, each at its own position.
    expect(lookup.at({ latitude: 37.46427, longitude: 126.95487 })).toMatchObject({ building: { number: '140' } });
    expect(lookup.at({ latitude: 37.46406, longitude: 126.9546 })).toMatchObject({ building: { number: '140-1' } });
    expect(lookup.at({ latitude: 37.46448, longitude: 126.95497 })).toMatchObject({ building: { number: '140-2' } });
  });
});
