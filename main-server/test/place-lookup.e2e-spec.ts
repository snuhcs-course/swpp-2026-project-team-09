import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { type PlaceLookup } from '../src/places/place-lookup.js';
import { startApp } from './start-app.js';

// The global setup loaded the seed into the shared database, and the server reads the Places when it starts.

let app: INestApplication<Server>;
let lookup: PlaceLookup;

beforeAll(async () => {
  app = await startApp(inject('settings'));
  // Imported after startApp, so that it is the class the server registered.
  const { PlaceLookup: registered } = await import('../src/places/place-lookup.js');
  lookup = app.get(registered);
});

afterAll(async () => {
  await app.close();
});

describe('The Place at a position', () => {
  it('is the Place whose outline holds the position', () => {
    // 제1공학관, at the position the campus map gives it.
    expect(lookup.at({ latitude: 37.45016, longitude: 126.95259 })).toMatchObject({
      place: { number: '301', name: '제1공학관' },
      relation: 'inside',
    });
  });

  // The next two positions lie west of the middle of 제1공학관's longest wall, at right angles to it, 3 m and 12 m from
  // it. The next outline, of 해동첨단공학관, is over 24 m from both.
  it('is still that Place up to 5 m outside its wall, where a phone inside is often placed', () => {
    expect(lookup.at({ latitude: 37.4502069, longitude: 126.9522581 })).toMatchObject({
      place: { number: '301' },
      relation: 'inside',
    });
  });

  it('is a Place nearby up to 20 m from its wall', () => {
    expect(lookup.at({ latitude: 37.4502049, longitude: 126.9521564 })).toMatchObject({
      place: { number: '301' },
      relation: 'near',
    });
  });

  it('is none when every Place is farther than 20 m', () => {
    // On the slope east of the engineering buildings, 83 m from the nearest outline and from the nearest position.
    expect(lookup.at({ latitude: 37.453, longitude: 126.956 })).toBeNull();
  });

  it('is a Place without an outline only nearby, within 20 m of its position', () => {
    // 붉은광장, a square, and 김철수물리관, which neither map draws, each at the position the campus map gives it.
    expect(lookup.at({ latitude: 37.45587314704376, longitude: 126.9512305146599 })).toMatchObject({
      place: { number: null, name: '붉은광장' },
      relation: 'near',
    });
    expect(lookup.at({ latitude: 37.458209, longitude: 126.951594 })).toMatchObject({
      place: { number: '56-1', name: '김철수물리관' },
      relation: 'near',
    });
  });
});

describe('The Place at a position inside one of its several outlines', () => {
  it('is that Place, whichever of its outlines holds the position', () => {
    // 문화관 is drawn as two polygons. The first position is 16 m inside the one that does not hold the Place's own
    // position, which lies 56 m away, and the second 18 m inside the other.
    expect(lookup.at({ latitude: 37.4612511, longitude: 126.9515046 })).toMatchObject({
      place: { number: '73', name: '문화관' },
      relation: 'inside',
    });
    expect(lookup.at({ latitude: 37.4616682, longitude: 126.9509852 })).toMatchObject({
      place: { number: '73' },
      relation: 'inside',
    });
    // The last of 사회과학관's five polygons, 72 m from the Place's own position.
    expect(lookup.at({ latitude: 37.4641523, longitude: 126.9511368 })).toMatchObject({
      place: { number: '16', name: '사회과학관' },
      relation: 'inside',
    });
  });
});

describe('The Place at a position between Places', () => {
  it('is the Place that holds the position, though the wall of another is within 5 m', () => {
    // 0.5 m inside 교직원아파트, 4.5 m from the wall of 가족생활관4, which comes before it in the list.
    expect(lookup.at({ latitude: 37.4669384, longitude: 126.9595729 })).toMatchObject({
      place: { number: '936' },
      relation: 'inside',
    });
  });

  it('is the Place whose wall is nearer, between two Places that both are within 5 m', () => {
    // 1.5 m outside 교직원아파트 and 2.5 m from 가족생활관4.
    expect(lookup.at({ latitude: 37.4669313, longitude: 126.9595521 })).toMatchObject({
      place: { number: '936' },
      relation: 'inside',
    });
  });

  it('is, of the Places that share one outline, the one whose position is nearest', () => {
    // 국제대학원 and 국제대학원2 share the polygon labelled `140동국제대학원`, each at its own position.
    expect(lookup.at({ latitude: 37.46427, longitude: 126.95487 })).toMatchObject({ place: { number: '140' } });
    expect(lookup.at({ latitude: 37.46406, longitude: 126.9546 })).toMatchObject({ place: { number: '140-1' } });
    // 국제회의동, at its own position inside the polygon that the national map labels `104-1동국제대학원`, which
    // `place-outlines.json` keeps from 반도체교육관 (104-1동), 1 km away.
    expect(lookup.at({ latitude: 37.46448, longitude: 126.95497 })).toMatchObject({ place: { number: '140-2' } });
  });

  it('is a Place without a number as any other, inside its outline', () => {
    // The middle of the field of 종합운동장, 55 m inside OpenStreetMap's 대운동장, and the middle of courts 7 and 8 of
    // 테니스장, 43 m from the position the campus map gives the courts.
    expect(lookup.at({ latitude: 37.464773, longitude: 126.950076 })).toMatchObject({
      place: { number: null, name: '종합운동장' },
      relation: 'inside',
    });
    expect(lookup.at({ latitude: 37.465023, longitude: 126.954051 })).toMatchObject({
      place: { number: null, name: '테니스장' },
      relation: 'inside',
    });
  });

  it('is, where the outlines of two Places hold the position, the one that comes first in the list', () => {
    // The stand of 종합운동장, inside the outline of 종합운동장본부석 (149동) and inside 대운동장. A Place with a number
    // comes before one without.
    expect(lookup.at({ latitude: 37.464447, longitude: 126.950667 })).toMatchObject({
      place: { number: '149', name: '종합운동장본부석' },
      relation: 'inside',
    });
  });
});
