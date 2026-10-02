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

  // The next three positions lie west of the middle of 제1공학관's longest wall, at right angles to it. The next
  // building is over 60 m away.
  it('is still that building up to 5 m outside its wall, where a phone inside is often placed', () => {
    expect(lookup.at({ latitude: 37.4502069, longitude: 126.9522581 })).toMatchObject({
      building: { number: '301' },
      relation: 'inside',
    });
  });

  it('is a building nearby up to 20 m from its wall', () => {
    expect(lookup.at({ latitude: 37.4502049, longitude: 126.9521564 })).toMatchObject({
      building: { number: '301' },
      relation: 'near',
    });
  });

  it('is none when every building is farther than 20 m', () => {
    expect(lookup.at({ latitude: 37.4502009, longitude: 126.951953 })).toBeNull();
  });

  it('is a place or a building without an outline only nearby, within 20 m of its position', () => {
    // 자하연, a pond, and 김철수물리관, which neither map draws, each at the position the campus map gives it.
    expect(lookup.at({ latitude: 37.4607006780578, longitude: 126.952103365166 })).toMatchObject({
      building: { number: null, name: '자하연' },
      relation: 'near',
    });
    expect(lookup.at({ latitude: 37.458209, longitude: 126.951594 })).toMatchObject({
      building: { number: '56-1', name: '김철수물리관' },
      relation: 'near',
    });
  });
});

describe('The building at a position inside one of its several outlines', () => {
  it('is that building, whichever of its outlines holds the position', () => {
    // 문화관 is drawn as two polygons. The first position is 16 m inside the one that does not hold the building's own
    // position, which lies 56 m away, and the second 18 m inside the other.
    expect(lookup.at({ latitude: 37.4612511, longitude: 126.9515046 })).toMatchObject({
      building: { number: '73', name: '문화관' },
      relation: 'inside',
    });
    expect(lookup.at({ latitude: 37.4616682, longitude: 126.9509852 })).toMatchObject({
      building: { number: '73' },
      relation: 'inside',
    });
    // The last of 사회과학관's five polygons, 72 m from the building's own position.
    expect(lookup.at({ latitude: 37.4641523, longitude: 126.9511368 })).toMatchObject({
      building: { number: '16', name: '사회과학관' },
      relation: 'inside',
    });
  });
});

describe('The building at a position between buildings', () => {
  it('is the building that holds the position, though the wall of another is within 5 m', () => {
    // 0.5 m inside 교직원아파트, 4.5 m from the wall of 가족생활관4, which comes before it in the list.
    expect(lookup.at({ latitude: 37.4669384, longitude: 126.9595729 })).toMatchObject({
      building: { number: '936' },
      relation: 'inside',
    });
  });

  it('is the building whose wall is nearer, between two buildings that both are within 5 m', () => {
    // 1.5 m outside 교직원아파트 and 2.5 m from 가족생활관4.
    expect(lookup.at({ latitude: 37.4669313, longitude: 126.9595521 })).toMatchObject({
      building: { number: '936' },
      relation: 'inside',
    });
  });

  it('is, of the buildings that share one outline, the one whose position is nearest', () => {
    // 국제대학원 and 국제대학원2 share the polygon labelled `140동국제대학원`, each at its own position.
    expect(lookup.at({ latitude: 37.46427, longitude: 126.95487 })).toMatchObject({ building: { number: '140' } });
    expect(lookup.at({ latitude: 37.46406, longitude: 126.9546 })).toMatchObject({ building: { number: '140-1' } });
    // 국제회의동, at its own position inside the polygon that the national map labels `104-1동국제대학원`, which a
    // correction keeps from 반도체교육관 (104-1동), 1 km away.
    expect(lookup.at({ latitude: 37.46448, longitude: 126.95497 })).toMatchObject({ building: { number: '140-2' } });
  });
});
