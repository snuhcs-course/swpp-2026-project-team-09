/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { fileURLToPath } from 'node:url';
import { readCampusBoundary } from '../src/common/campus-boundary.js';
import { SEED_DIRECTORY } from '../src/common/seed-directory.js';
import { readSeedPlaces } from '../src/places/places.seed.js';
import { readTutorialContent, TUTORIAL_FILE, type TutorialContent } from '../src/tutorial/tutorial-content.js';

function fixture(name: string): string {
  return fileURLToPath(new URL(`fixtures/tutorial/${name}`, import.meta.url));
}

let content: TutorialContent;

beforeAll(async () => {
  content = await readTutorialContent(TUTORIAL_FILE);
});

describe("The tutorial's content", () => {
  it("holds the spec's five quests in order", () => {
    expect(content.quests.map(({ order, key, title, completion }) => [order, key, title, completion.kind])).toEqual([
      [1, 's-card', '학생증(S-CARD) 발급받기', 'button'],
      [2, 'admin-shuttle', '행정관 셔틀 이용하기', 'button'],
      [3, 'kwanjeong', '관정도서관 예약하기', 'kwanjeongCheck'],
      [4, 'health-clinic', '서울대 보건진료소 이용', 'button'],
      [5, 'art-museum', '서울대 미술관/파워플랜트 관람', 'button'],
    ]);
  });

  it('has unique keys', () => {
    const keys = content.quests.map(({ key }) => key);

    expect(new Set(keys).size).toBe(keys.length);
  });

  it('names only Places whose number the shared seed holds', async () => {
    const seed = await readSeedPlaces(SEED_DIRECTORY, await readCampusBoundary(SEED_DIRECTORY));
    const numbers = new Set(seed.map(({ number }) => number));
    const named = content.quests.flatMap(({ places }) => places.flatMap((entry) => ('place' in entry ? [entry] : [])));

    expect(named.map(({ place }) => place)).toEqual(['67', '4', '62-1', '63', '151', '68']);
    expect(named.filter(({ place }) => !numbers.has(place))).toEqual([]);
  });
});

describe("The tutorial's places and links", () => {
  it('places the shuttle stop at the middle of its plus code, 8Q98FX62+94', () => {
    const shuttle = content.quests.find(({ key }) => key === 'admin-shuttle');

    expect(shuttle?.places).toEqual([
      { point: { latitude: 37.460938, longitude: 126.950312 }, label: '행정관 셔틀 정류장 (행정관 잔디광장 아래)' },
    ]);
  });

  it('links only to web addresses', () => {
    const urls = content.quests.flatMap(({ links }) => links.map(({ url }) => new URL(url)));

    expect(urls.map(({ protocol }) => protocol).filter((protocol) => !['http:', 'https:'].includes(protocol))).toEqual(
      [],
    );
    expect(urls.map(({ host }) => host)).toEqual([
      'my.snu.ac.kr',
      'student.snu.ac.kr',
      ...Array.from({ length: 5 }, () => 'health4u.snu.ac.kr'),
      'www.snumoa.org',
      'culture.snu.ac.kr',
    ]);
  });

  it('gives the 관정 quest its skip', () => {
    expect(content.quests.find(({ key }) => key === 'kwanjeong')?.completion).toEqual({
      kind: 'kwanjeongCheck',
      skipLabel: '이미 예약 및 이용해본 적이 있어요',
    });
  });
});

describe('A tutorial file', () => {
  it('is refused with the key it repeats', async () => {
    await expect(readTutorialContent(fixture('repeated-key.yaml'))).rejects.toThrow('Repeats the key s-card');
  });

  it('is refused with a completion kind that does not exist', async () => {
    await expect(readTutorialContent(fixture('unknown-completion.yaml'))).rejects.toThrow('quests[0].completion.kind');
  });

  it('is refused when it is not YAML', async () => {
    await expect(readTutorialContent(fixture('not-yaml.yaml'))).rejects.toThrow();
  });
});
