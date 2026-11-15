/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { z } from 'zod';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { signInUser, type TestUser } from './friends.js';
import { patchProfile } from './profile.js';
import { withAccessToken } from './sign-in.js';
import { startApp } from './start-app.js';

// GET /study-spaces: the 공부공간 layer as each User sees it, by the User's 학과 and 소속.

const servedSpaceSchema = z.looseObject({ key: z.string(), usable: z.boolean(), restrictedTo: z.string().nullable() });
type ServedSpace = z.infer<typeof servedSpaceSchema>;

const servedBuildingSchema = z.object({
  place: z.looseObject({ number: z.string() }),
  name: z.string(),
  usable: z.boolean(),
  liveSeats: z.object({ sectors: z.array(z.looseObject({ name: z.string() })) }).nullable(),
  spaces: z.array(servedSpaceSchema),
});
type ServedBuilding = z.infer<typeof servedBuildingSchema>;

let app: INestApplication<Server>;
// Sets a department no onboarding can send: an empty one.
let prisma: PrismaClient;

beforeAll(async () => {
  app = await startApp(inject('settings'));
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: inject('settings').DATABASE_URL }) });
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

function getStudySpaces(accessToken?: string): request.Test {
  return withAccessToken(request(app.getHttpServer()).get('/study-spaces'), accessToken);
}

async function studySpacesOf(user: TestUser): Promise<ServedBuilding[]> {
  const response = await getStudySpaces(user.accessToken);
  expect(response.status).toBe(200);
  return z.array(servedBuildingSchema).parse(response.body);
}

async function userOf(department: string, affiliation: string | null = null): Promise<TestUser> {
  const user = await signInUser(app, { name: '홍길동', department });
  if (affiliation !== null) {
    expect((await patchProfile(app, user.accessToken, { affiliation })).status).toBe(200);
  }
  return user;
}

function building(buildings: ServedBuilding[], number: string): ServedBuilding {
  const found = buildings.find(({ place }) => place.number === number);
  if (found === undefined) {
    throw new Error(`No building at ${number}`);
  }
  return found;
}

function space(buildings: ServedBuilding[], key: string): ServedSpace {
  const found = buildings.flatMap(({ spaces }) => spaces).find((candidate) => candidate.key === key);
  if (found === undefined) {
    throw new Error(`No space ${key}`);
  }
  return found;
}

// The keys of the spaces a User may not use.
function greyKeys(buildings: ServedBuilding[]): string[] {
  return buildings.flatMap(({ spaces }) => spaces.filter(({ usable }) => !usable).map(({ key }) => key));
}

const RESTRICTED = [
  'business-reading-room',
  'business-group-rooms',
  'social-sciences-group-rooms',
  'veterinary-healing-space',
  'engineering-sinyang-group-rooms',
  'yuhoejin-study-rooms',
  'ece-haedong',
  'me-haedong-study-hall',
  'cse-student-space',
  'cbe-haedong',
  'cse-software-lab',
];

describe('GET /study-spaces', () => {
  it('refuses a User who is not signed in', async () => {
    expect((await getStudySpaces()).status).toBe(401);
  });

  it('serves every building at its Place, with no note, source or confidence', async () => {
    const buildings = await studySpacesOf(await userOf('경영학과'));

    expect(buildings).toHaveLength(15);
    expect(building(buildings, '62-1')).toMatchObject({ name: '관정관', usable: true });
    const served = buildings[0]?.spaces[0] ?? {};
    expect(Object.keys(served).toSorted()).toEqual(['hours', 'key', 'kind', 'link', 'name', 'restrictedTo', 'usable']);
  });
});

describe('GET /study-spaces by the 학과', () => {
  it('gives a 경영학과 User the 경영학도서관 열람실, and the 공대 rooms grey', async () => {
    const buildings = await studySpacesOf(await userOf('경영학과'));

    expect(space(buildings, 'business-reading-room')).toEqual(
      expect.objectContaining({ usable: true, restrictedTo: '경영대학' }),
    );
    expect(space(buildings, 'business-group-rooms').usable).toBe(true);
    expect(space(buildings, 'ece-haedong')).toEqual(
      expect.objectContaining({ usable: false, restrictedTo: '전기·정보공학부·컴퓨터공학부' }),
    );
    expect(building(buildings, '58').usable).toBe(true);
    expect(building(buildings, '300').usable).toBe(false);
  });

  it('greys the 경영학도서관 열람실 for a 국어국문학과 User and keeps the building, whose 자유열람석 is open', async () => {
    const buildings = await studySpacesOf(await userOf('국어국문학과'));

    expect(space(buildings, 'business-reading-room')).toEqual(
      expect.objectContaining({ usable: false, restrictedTo: '경영대학' }),
    );
    expect(space(buildings, 'business-free-seats')).toEqual(
      expect.objectContaining({ usable: true, restrictedTo: null }),
    );
    expect(building(buildings, '58').usable).toBe(true);
    expect(greyKeys(buildings)).toEqual(RESTRICTED);
    expect(building(buildings, '301').usable).toBe(false);
    expect(building(buildings, '302').usable).toBe(false);
  });

  it('gives a 화학생물공학부 User its own 해동 room and the 공과대학 rooms, not another department’s', async () => {
    const buildings = await studySpacesOf(await userOf('화학생물공학부'));

    expect(space(buildings, 'cbe-haedong').usable).toBe(true);
    expect(space(buildings, 'yuhoejin-study-rooms').usable).toBe(true);
    expect(space(buildings, 'engineering-sinyang-group-rooms').usable).toBe(true);
    expect(space(buildings, 'cse-software-lab').usable).toBe(false);
    expect(space(buildings, 'ece-haedong').usable).toBe(false);
    expect(building(buildings, '302').usable).toBe(true);
    expect(building(buildings, '300').usable).toBe(true);
    expect(building(buildings, '301').usable).toBe(false);
  });
});

describe('GET /study-spaces by the 소속, and without a 학과', () => {
  it("lists 관정관's 대학원 열람실 among its seat sectors for a graduate User only", async () => {
    const graduate = await studySpacesOf(await userOf('경영학과', 'graduate'));
    const undergraduate = await studySpacesOf(await userOf('경영학과', 'undergraduate'));
    const unsaid = await studySpacesOf(await userOf('경영학과'));

    const sectorsOf = (buildings: ServedBuilding[]): string[] =>
      building(buildings, '62-1').liveSeats?.sectors.map(({ name }) => name) ?? [];
    expect(sectorsOf(graduate).some((name) => name === '대학원 열람실')).toBe(true);
    expect(sectorsOf(undergraduate).some((name) => name === '대학원 열람실')).toBe(false);
    expect(sectorsOf(unsaid).some((name) => name === '대학원 열람실')).toBe(false);
    expect(sectorsOf(undergraduate).length).toBeGreaterThan(0);
    expect(building(graduate, '62').liveSeats).toBeNull();
  });

  it('greys every restricted space for a User whose department is empty', async () => {
    const user = await userOf('경영학과');
    await prisma.user.update({ where: { id: user.id }, data: { department: '' } });

    const buildings = await studySpacesOf(user);

    expect(greyKeys(buildings)).toEqual(RESTRICTED);
    expect(space(buildings, 'central-library').usable).toBe(true);
  });

  it('greys every restricted space for a department the table does not hold', async () => {
    expect(greyKeys(await studySpacesOf(await userOf('없는학과')))).toEqual(RESTRICTED);
  });

  it('serves the same to a User with no 소속 as to one whose 소속 is said, outside 관정관', async () => {
    const unsaid = await studySpacesOf(await userOf('컴퓨터공학부'));
    const said = await studySpacesOf(await userOf('컴퓨터공학부', 'undergraduate'));

    expect(said.map(({ spaces }) => spaces)).toEqual(unsaid.map(({ spaces }) => spaces));
    expect(space(unsaid, 'cse-student-space').usable).toBe(true);
    expect(space(unsaid, 'me-haedong-study-hall').usable).toBe(false);
  });
});
