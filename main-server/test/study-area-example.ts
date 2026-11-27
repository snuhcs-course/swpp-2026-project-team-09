/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Test } from '@nestjs/testing';
import { type StudyArea } from '../src/assistant/lookup/study-near.js';
import { type Catalogue, CATALOGUE_FILE, readCatalogue } from '../src/assistant/library/catalogue.js';
import { readCampusBoundary } from '../src/common/campus-boundary.js';
import { SEED_DIRECTORY } from '../src/common/seed-directory.js';
import { type Affiliation } from '../src/generated/prisma/client.js';
import { type PlaceDto } from '../src/places/dto/place.dto.js';
import { PlaceLookup } from '../src/places/place-lookup.js';
import { readSeedPlaces } from '../src/places/places.seed.js';
import { type StudyBuildingDto } from '../src/study-spaces/dto/study-spaces.dto.js';
import { openAt, type Opening } from '../src/study-spaces/study-hours.js';
import { type Standing, STUDY_SPACES_FILE, studySpacesSchema } from '../src/study-spaces/study-spaces-file.js';
import { readSeedFile } from '../src/common/seed-directory.js';
import { STUDY_CATALOGUE, StudySpacesService } from '../src/study-spaces/study-spaces.service.js';
import { UsersService } from '../src/users/users.service.js';

// The 공부공간 layer of the seed as it is listed for a User of a department, and the visible areas of "이 근처".

// Board a9: the map moved over 공대, holding 44-1동, 300동, 301동, and 302동, with 관정관 to the north of it.
export const A9_AREA: StudyArea = { south: 37.447, west: 126.949, north: 37.456, east: 126.956 };

// Around 301동 and 302동 only.
export const ENGINEERING_AREA: StudyArea = { south: 37.4485, west: 126.952, north: 37.4505, east: 126.953 };

// 관악산, south of the campus, with no study space.
export const MOUNTAIN_AREA: StudyArea = { south: 37.44, west: 126.94, north: 37.443, east: 126.945 };

// 중앙도서관 and 관정관.
export const LIBRARY_AREA: StudyArea = { south: 37.458, west: 126.95, north: 37.4605, east: 126.954 };

async function seedPlaces(): Promise<PlaceDto[]> {
  const seed = await readSeedPlaces(SEED_DIRECTORY, await readCampusBoundary(SEED_DIRECTORY));
  return seed.map(({ id, number, name, latitude, longitude }) => ({ id, number, name, latitude, longitude }));
}

// The study spaces, each marked usable or not, as GET /study-spaces gives them to a User of that department.
export async function studyBuildingsFor(
  department: string,
  affiliation: Affiliation | null = null,
): Promise<StudyBuildingDto[]> {
  const places = await seedPlaces();
  const standing: Standing = { department, affiliation };
  const moduleRef = await Test.createTestingModule({
    providers: [
      StudySpacesService,
      {
        provide: PlaceLookup,
        useValue: { numbered: (number: string): PlaceDto | null => places.find((p) => p.number === number) ?? null },
      },
      { provide: UsersService, useValue: { findById: (): Promise<Standing> => Promise.resolve(standing) } },
      { provide: STUDY_CATALOGUE, useFactory: (): Promise<Catalogue> => readCatalogue(CATALOGUE_FILE) },
    ],
  }).compile();
  const service = moduleRef.get(StudySpacesService);
  await service.onModuleInit();
  return service.listFor('asker');
}

// Whether a space is open at a time, by the seed's schedules and calendar, as StudySpacesService.hoursOf answers it.
export async function seedHours(): Promise<(key: string, at: Date) => { opening: Opening }> {
  const file = await readSeedFile(SEED_DIRECTORY, STUDY_SPACES_FILE, studySpacesSchema);
  const schedules = new Map(file.buildings.flatMap(({ spaces }) => spaces.map(({ key, schedule }) => [key, schedule])));
  return (key, at) => {
    const schedule = schedules.get(key);
    if (schedule === undefined) {
      throw new Error(`No hours for ${key}`);
    }
    return { opening: openAt(schedule, file.calendar, at) };
  };
}
