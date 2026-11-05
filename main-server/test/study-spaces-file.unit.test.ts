/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { readCampusBoundary } from '../src/common/campus-boundary.js';
import { readSeedFile, SEED_DIRECTORY } from '../src/common/seed-directory.js';
import { type PlaceDto } from '../src/places/dto/place.dto.js';
import { readSeedPlaces } from '../src/places/places.seed.js';
import {
  DEPARTMENT_COLLEGES_FILE,
  type DepartmentColleges,
  departmentCollegesOf,
  departmentCollegesSchema,
  isUsable,
  placedBuildings,
  problemsOf,
  type Restriction,
  STUDY_SPACES_FILE,
  type StudySpacesFile,
  studySpacesSchema,
} from '../src/study-spaces/study-spaces-file.js';

// The 공부공간 layer's two seed files, and the rules that read them.

let file: StudySpacesFile;
let table: DepartmentColleges;

beforeAll(async () => {
  file = await readSeedFile(SEED_DIRECTORY, STUDY_SPACES_FILE, studySpacesSchema);
  table = departmentCollegesOf(await readSeedFile(SEED_DIRECTORY, DEPARTMENT_COLLEGES_FILE, departmentCollegesSchema));
});

function place(number: string): PlaceDto {
  return { id: `p${number}`, number, name: number, latitude: 37.46, longitude: 126.95 };
}

describe('study-spaces.json', () => {
  it("holds the spec's buildings in its order, 중앙도서관 and 관정관 one entry each", () => {
    expect(file.buildings.map(({ place: number, name }) => `${number} ${name}`)).toEqual([
      '62 중앙도서관',
      '62-1 관정관',
      '58 경영학도서관',
      '72 법학도서관',
      '15 제1법학관',
      '16 사회과학도서관',
      '75-1 농학도서관',
      '81 수의학도서관',
      '74 음악도서관',
      '140-1 국제학도서관',
      '44-1 공대 신양학술정보관',
      '300 유회진학술정보관',
      '301 제1공학관',
      '302 제2공학관',
      '4 인문대 신양학술정보관',
    ]);
    expect(file.buildings.find(({ place: number }) => number === '62')?.spaces).toHaveLength(1);
    expect(file.buildings.find(({ place: number }) => number === '62-1')?.spaces).toHaveLength(1);
  });

  it('gives live seats to 관정관 alone', () => {
    expect(file.buildings.filter(({ liveSeats }) => liveSeats !== null).map(({ name }) => name)).toEqual(['관정관']);
  });
});

describe('The spaces of study-spaces.json', () => {
  it('has unique keys, and every restriction names a college or a department of the table', () => {
    const keys = file.buildings.flatMap(({ spaces }) => spaces.map(({ key }) => key));

    expect(new Set(keys).size).toBe(keys.length);
    expect(problemsOf(file, table)).toEqual([]);
  });

  it('restricts the spaces the spec restricts, with their labels', () => {
    const restricted = file.buildings.flatMap(({ spaces }) =>
      spaces.flatMap(({ key, restriction }) => (restriction === null ? [] : [`${key} ${restriction.label}`])),
    );

    expect(restricted).toEqual([
      'business-reading-room 경영대학',
      'business-group-rooms 경영대학',
      'social-sciences-group-rooms 사회과학대학',
      'veterinary-healing-space 수의과대학',
      'engineering-sinyang-group-rooms 공과대학',
      'yuhoejin-study-rooms 공과대학',
      'ece-haedong 전기·정보공학부·컴퓨터공학부',
      'me-haedong-study-hall 기계공학부',
      'cse-student-space 컴퓨터공학부',
      'cbe-haedong 화학생물공학부',
      'cse-software-lab 컴퓨터공학부',
    ]);
  });

  it('stands every building at a Place of the seed', async () => {
    const seed = await readSeedPlaces(SEED_DIRECTORY, await readCampusBoundary(SEED_DIRECTORY));
    const numbers = new Set(seed.map(({ number }) => number));

    expect(file.buildings.filter(({ place: number }) => !numbers.has(number))).toEqual([]);
  });
});

describe('A check of the data', () => {
  it('stops the start at a Place number the seed does not hold, naming it', () => {
    const buildings = [file.buildings[0], { ...file.buildings[1], place: '999' }].flatMap((one) => one ?? []);

    expect(() => placedBuildings(buildings, (number) => (number === '999' ? null : place(number)))).toThrow(
      'study-spaces.json names the Places 999, which the seed does not hold',
    );
  });

  it('finds a restriction that names an unknown college or department, and a repeated key', () => {
    const [first] = file.buildings;
    const space = first?.spaces[0];
    if (first === undefined || space === undefined) {
      throw new Error('The file has no building');
    }
    const bad: StudySpacesFile = {
      ...file,
      buildings: [
        {
          ...first,
          spaces: [
            { ...space, restriction: { colleges: ['우주대학'], label: '우주대학' } },
            { ...space, restriction: { departments: ['마법학과'], label: '마법학과' } },
          ],
        },
      ],
    };

    expect(problemsOf(bad, table)).toEqual([
      'central-library names the college 우주대학, which department-colleges.json does not hold',
      'The key central-library repeats',
      'central-library names the department 마법학과, which department-colleges.json does not hold',
    ]);
  });
});

describe('Whether a space is usable', () => {
  const business: Restriction = { colleges: ['경영대학'], label: '경영대학' };
  const cbe: Restriction = { departments: ['화학생물공학부'], label: '화학생물공학부' };
  const graduate: Restriction = { graduateOnly: true, label: '대학원' };

  it('is so for everyone without a restriction, even with an empty 학과', () => {
    expect(isUsable(null, { department: '', affiliation: null }, table)).toBe(true);
  });

  it("follows the 학과's college", () => {
    expect(isUsable(business, { department: '경영학과', affiliation: null }, table)).toBe(true);
    expect(isUsable(business, { department: '국어국문학과', affiliation: null }, table)).toBe(false);
  });

  it('follows the 학과 by its name', () => {
    expect(isUsable(cbe, { department: '화학생물공학부', affiliation: 'undergraduate' }, table)).toBe(true);
    expect(isUsable(cbe, { department: '재료공학부', affiliation: 'undergraduate' }, table)).toBe(false);
  });

  it('is not so for an empty 학과 or one the table does not hold', () => {
    expect(isUsable(business, { department: '', affiliation: null }, table)).toBe(false);
    expect(isUsable(business, { department: '경영학부', affiliation: null }, table)).toBe(false);
  });

  it('follows the 소속 for graduate students, and is not so without one', () => {
    expect(isUsable(graduate, { department: '경영학과', affiliation: 'graduate' }, table)).toBe(true);
    expect(isUsable(graduate, { department: '경영학과', affiliation: 'undergraduate' }, table)).toBe(false);
    expect(isUsable(graduate, { department: '경영학과', affiliation: null }, table)).toBe(false);
  });
});
