/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { z } from 'zod';
import { type Affiliation } from '../generated/prisma/client.js';
import { type PlaceDto } from '../places/dto/place.dto.js';

// The 공부공간 layer's data (README.md: Seed data): `seed/study-spaces.json`, the Study Spaces by building, and
// `seed/department-colleges.json`, the college of each department of the app's list. Both are read once when the
// server starts; a file that does not match, or a restriction that names a college or a department the table does not
// hold, stops the start.

export const STUDY_SPACES_FILE = 'study-spaces.json';
export const DEPARTMENT_COLLEGES_FILE = 'department-colleges.json';

const text = z.string().trim().min(1);
const url = z.url({ protocol: /^https?$/u });

// Open only to some Users. `label` fills "○○ 학생만 사용할 수 있어요".
const restrictionSchema = z
  .strictObject({
    colleges: z.array(text).min(1).optional(),
    departments: z.array(text).min(1).optional(),
    graduateOnly: z.literal(true).optional(),
    label: text,
  })
  .refine(
    ({ colleges, departments, graduateOnly }) =>
      colleges !== undefined || departments !== undefined || graduateOnly !== undefined,
    'Expected colleges, departments or graduateOnly',
  );

const spaceSchema = z.strictObject({
  key: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u, 'Expected a key in lowercase words joined by dashes'),
  name: text,
  kind: z.enum(['library', 'reading', 'lounge', 'pc', 'group']),
  // Display text, such as "07:00–23:00"; null when the sources do not give it.
  hours: text.nullable(),
  restriction: restrictionSchema.nullable(),
  link: url.nullable(),
  source: url,
  confidence: z.enum(['high', 'medium']),
  // A conflict between sources, for the reviewer. Never served.
  note: text.nullable(),
});

const buildingSchema = z.strictObject({
  // A Place number of the seed: the building's pin stands at that Place.
  place: text,
  name: text,
  // Where the phone reads live seats from: 관정관's through the User's own Library Session.
  liveSeats: z.literal('kwanjeong').nullable(),
  spaces: z.array(spaceSchema).min(1),
});

export const studySpacesSchema = z.strictObject({
  checkedOn: z.iso.date(),
  buildings: z.array(buildingSchema).min(1),
});

export const departmentCollegesSchema = z.strictObject({
  checkedOn: z.iso.date(),
  // A department's name, as the app lists it, to the college that runs it, or null for none (협동과정, most 전문·특수대학원).
  departments: z.record(text, text.nullable()),
});

export type StudySpacesFile = z.infer<typeof studySpacesSchema>;
export type StudyBuilding = StudySpacesFile['buildings'][number];
export type StudySpace = StudyBuilding['spaces'][number];
export type Restriction = NonNullable<StudySpace['restriction']>;
export type DepartmentColleges = ReadonlyMap<string, string | null>;

export function departmentCollegesOf(file: z.infer<typeof departmentCollegesSchema>): DepartmentColleges {
  return new Map(Object.entries(file.departments));
}

// What is wrong with the data against the table: a repeated building or space key, and a restriction that names a
// college or a department the table does not hold. Empty when nothing is.
export function problemsOf(file: StudySpacesFile, table: DepartmentColleges): string[] {
  const colleges = new Set([...table.values()].filter((college) => college !== null));
  const problems: string[] = [];
  const keys = new Set<string>();
  const places = new Set<string>();
  for (const { place, spaces } of file.buildings) {
    if (places.has(place)) {
      problems.push(`The Place ${place} has two buildings`);
    }
    places.add(place);
    for (const { key, restriction } of spaces) {
      if (keys.has(key)) {
        problems.push(`The key ${key} repeats`);
      }
      keys.add(key);
      for (const college of restriction?.colleges ?? []) {
        if (!colleges.has(college)) {
          problems.push(`${key} names the college ${college}, which department-colleges.json does not hold`);
        }
      }
      for (const department of restriction?.departments ?? []) {
        if (!table.has(department)) {
          problems.push(`${key} names the department ${department}, which department-colleges.json does not hold`);
        }
      }
    }
  }
  return problems;
}

// What 내 정보 says of the User: the department from onboarding and the 소속.
export interface Standing {
  department: string;
  affiliation: Affiliation | null;
}

// Whether a User may use a space. What 내 정보 does not say is never taken to qualify: an empty department, one the
// table does not hold, and no 소속 where only graduate students may use it are not usable.
export function isUsable(
  restriction: Restriction | null,
  { department, affiliation }: Standing,
  table: DepartmentColleges,
): boolean {
  if (restriction === null) {
    return true;
  }
  const { colleges, departments, graduateOnly } = restriction;
  if (graduateOnly === true && affiliation !== 'graduate') {
    return false;
  }
  const college = table.get(department) ?? null;
  const byDepartment = departments?.includes(department) ?? false;
  const byCollege = college !== null && (colleges?.includes(college) ?? false);
  if (colleges === undefined && departments === undefined) {
    return true;
  }
  return byDepartment || byCollege;
}

export interface PlacedBuilding extends StudyBuilding {
  at: PlaceDto;
}

// Each building at its Place. A Place number the seed does not hold stops the start, with every such number.
export function placedBuildings(
  buildings: readonly StudyBuilding[],
  numbered: (number: string) => PlaceDto | null,
): PlacedBuilding[] {
  const missing: string[] = [];
  const placed = buildings.flatMap((building) => {
    const at = numbered(building.place);
    if (at === null) {
      missing.push(building.place);
      return [];
    }
    return [{ ...building, at }];
  });
  if (missing.length > 0) {
    throw new Error(`${STUDY_SPACES_FILE} names the Places ${missing.join(', ')}, which the seed does not hold`);
  }
  return placed;
}
