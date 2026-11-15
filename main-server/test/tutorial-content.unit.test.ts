/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { fileURLToPath } from 'node:url';
import { readCampusBoundary } from '../src/common/campus-boundary.js';
import { SEED_DIRECTORY } from '../src/common/seed-directory.js';
import { readSeedPlaces } from '../src/places/places.seed.js';
import {
  KWANJEONG_SITE,
  readTutorialContent,
  servedContent,
  TUTORIAL_FILE,
  type TutorialContent,
  type TutorialQuest,
} from '../src/tutorial/tutorial-content.js';

function fixture(name: string): string {
  return fileURLToPath(new URL(`fixtures/tutorial/${name}`, import.meta.url));
}

let content: TutorialContent;

const ASK = '관정도서관 7층 열람실에 한 자리 예약해줘';

function servedKwanjeong(libraryBooking: boolean, kwanjeongCheck: boolean): TutorialQuest | undefined {
  return servedContent(content, { libraryBooking, kwanjeongCheck }).quests.find(({ key }) => key === 'kwanjeong');
}

beforeAll(async () => {
  content = await readTutorialContent(TUTORIAL_FILE);
});

describe("The tutorial's content", () => {
  it("holds the P13 spec's fifteen quests in order, each in its category", () => {
    expect(
      content.quests.map(({ order, category, key, title, completion }) => [
        order,
        category,
        key,
        title,
        completion.kind,
      ]),
    ).toEqual([
      [1, 'life', 's-card', '학생증(S-CARD) 발급받기', 'button'],
      [2, 'life', 'thousand-won-meals', '천원의 식사 이용하기', 'button'],
      [3, 'life', 'lost-and-found', '분실물센터 위치 알아두기', 'button'],
      [4, 'life', 'laptop-rental', '노트북 대여 서비스 알아두기', 'button'],
      [5, 'study', 'kwanjeong', '관정도서관 예약하기', 'kwanjeongCheck'],
      [6, 'study', 'su-grading-option', '성적평가방법 선택제(S/U) 신청하기', 'button'],
      [7, 'study', 'chatgpt-edu', 'ChatGPT Edu 무료로 쓰기', 'button'],
      [8, 'study', 'ms365-campus-software', '캠퍼스 라이선스 소프트웨어 받기', 'button'],
      [9, 'transit', 'admin-shuttle', '행정관 셔틀 이용하기', 'button'],
      [10, 'transit', 'night-shuttle', '야간 셔틀 타기', 'button'],
      [11, 'health', 'health-clinic', '서울대 보건진료소 이용', 'button'],
      [12, 'health', 'counseling-center', '대학생활문화원 상담 알아두기', 'button'],
      [13, 'culture', 'art-museum', '서울대 미술관/파워플랜트 관람', 'button'],
      [14, 'culture', 'dure-practice-room', '두레문예관 연습실 예약하기', 'button'],
      [15, 'culture', 'gwanaksan-engineering-trail', '공학관 코스로 관악산 오르기', 'button'],
    ]);
  });

  it('has unique keys', () => {
    const keys = content.quests.map(({ key }) => key);

    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('The Tutorial Categories', () => {
  it('lists the five Tutorial Categories in display order', () => {
    expect(content.categories).toEqual([
      { key: 'life', label: '생활' },
      { key: 'study', label: '공부·학사' },
      { key: 'transit', label: '이동' },
      { key: 'health', label: '건강' },
      { key: 'culture', label: '문화·여가' },
    ]);
  });
});

describe("The new quests' facts", () => {
  it('leaves out of the campus software quest whether a personal laptop may hold it', () => {
    const quest = content.quests.find(({ key }) => key === 'ms365-campus-software');
    const words = JSON.stringify([quest?.body, quest?.facts]);

    expect(words).not.toContain('노트북');
    expect(words).not.toContain('개인 PC');
  });

  it('gives every new quest its facts, each with a source and the day it was checked', () => {
    const added = content.quests.filter(({ order }) => ![1, 5, 9, 11, 13].includes(order));

    expect(added.filter(({ facts }) => facts.length === 0)).toEqual([]);
    expect(added.flatMap(({ facts }) => facts.map(({ checked }) => checked))).toEqual(
      added.flatMap(({ facts }) => facts.map(() => '2026-11-04')),
    );
  });
});

describe("The tutorial's places and links", () => {
  it('names only Places whose number the shared seed holds', async () => {
    const seed = await readSeedPlaces(SEED_DIRECTORY, await readCampusBoundary(SEED_DIRECTORY));
    const numbers = new Set(seed.map(({ number }) => number));
    const named = content.quests.flatMap(({ places }) => places.flatMap((entry) => ('place' in entry ? [entry] : [])));

    expect(named.map(({ place }) => place)).toEqual([
      '67',
      '4',
      '63',
      '101',
      '102',
      '62-1',
      '302',
      '63',
      '63',
      '151',
      '68',
      '67',
    ]);
    expect(named.filter(({ place }) => !numbers.has(place))).toEqual([]);
  });

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
    expect(urls.filter(({ protocol }) => protocol !== 'https:').map(String)).toEqual(['http://www.snumoa.org/']);
  });
});

describe('The 관정 quest', () => {
  it('has its skip and its ask', () => {
    expect(content.quests.find(({ key }) => key === 'kwanjeong')).toMatchObject({
      completion: { kind: 'kwanjeongCheck', skipLabel: '이미 예약 및 이용해본 적이 있어요' },
      ask: ASK,
    });
  });

  it('serves the 관정 quest checked only while 관정 booking and the check are both on', () => {
    expect(servedKwanjeong(true, true)).toMatchObject({ completion: { kind: 'kwanjeongCheck' }, ask: ASK });
    expect(servedKwanjeong(true, false)).toMatchObject({ completion: { kind: 'button' }, ask: ASK, links: [] });
    for (const check of [true, false]) {
      expect(servedKwanjeong(false, check)).toMatchObject({ completion: { kind: 'button' }, links: [KWANJEONG_SITE] });
      expect(servedKwanjeong(false, check)).not.toHaveProperty('ask');
    }
  });
});

describe('A tutorial file', () => {
  it('is refused with the key it repeats', async () => {
    await expect(readTutorialContent(fixture('repeated-key.yaml'))).rejects.toThrow('Repeats the key s-card');
  });

  it('is refused with a completion kind that does not exist', async () => {
    await expect(readTutorialContent(fixture('unknown-completion.yaml'))).rejects.toThrow('quests[0].completion.kind');
  });

  it('is refused with a category that `categories` does not list', async () => {
    await expect(readTutorialContent(fixture('unknown-category.yaml'))).rejects.toThrow(
      'Names no category of `categories`: dining',
    );
  });

  it('is refused with a quest without its category when the file lists categories', async () => {
    await expect(readTutorialContent(fixture('missing-category.yaml'))).rejects.toThrow('quests[0].category');
  });

  it('is refused with a category that holds no quest', async () => {
    await expect(readTutorialContent(fixture('empty-category.yaml'))).rejects.toThrow(
      'The category study holds no quest',
    );
  });

  it('is refused with a category whose quests are split in `order`', async () => {
    await expect(readTutorialContent(fixture('split-category.yaml'))).rejects.toThrow(
      'The quests of the category life are not one after another in `order`',
    );
  });

  it('is refused when it is not YAML', async () => {
    await expect(readTutorialContent(fixture('not-yaml.yaml'))).rejects.toThrow();
  });
});
