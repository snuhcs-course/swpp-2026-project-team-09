import { type Meal, type MenuLine, type RestaurantMenu } from '../src/menu/dto/menus-collected.dto.js';
import { parseMenuPage } from '../src/menu/menu-page.parser.js';
import { blockPage, savedPage } from './pages.js';

const coopPage = savedPage('coop-menus-2026-10-01');

function restaurantOn(page: string, name: string): RestaurantMenu | undefined {
  return parseMenuPage(page, '2026-10-01').find((restaurant) => restaurant.name === name);
}

// The lines of one meal, without the meal each of them names.
function mealOn(page: string, restaurant: string, meal: Meal): Omit<MenuLine, 'meal'>[] | undefined {
  return restaurantOn(page, restaurant)
    ?.lines.filter((line) => line.meal === meal)
    .map(({ text, kind, price, name }) => ({ text, kind, price, name }));
}

describe("The Co-op's menu page", () => {
  it('gives a restaurant without its telephone number, and each meal as the lines of its cell', () => {
    expect(restaurantOn(coopPage, '학생회관식당')).toEqual({
      name: '학생회관식당',
      lines: [
        { meal: 'breakfast', text: '쇠고기채소찌개 : 3,000원', kind: 'dish', price: 3000, name: '쇠고기채소찌개' },
        { meal: 'breakfast', text: '※ 운영시간 : 08:00~10:00', kind: 'note', price: null, name: null },
        { meal: 'lunch', text: '눈꽃치즈닭갈비 : 6,000원', kind: 'dish', price: 6000, name: '눈꽃치즈닭갈비' },
        {
          meal: 'lunch',
          text: '단호박영양밥&양념장(#) : 3,000원',
          kind: 'dish',
          price: 3000,
          name: '단호박영양밥&양념장(#)',
        },
        { meal: 'lunch', text: '수제탕수육 : 6,000원', kind: 'dish', price: 6000, name: '수제탕수육' },
        { meal: 'lunch', text: '※ 운영시간 : 11:00~14:30', kind: 'note', price: null, name: null },
        { meal: 'lunch', text: '※ 혼잡시간 : 11:50~12:20', kind: 'note', price: null, name: null },
        { meal: 'dinner', text: '갈비구이 : 6,000원', kind: 'dish', price: 6000, name: '갈비구이' },
        { meal: 'dinner', text: '꽁치무조림(#) : 3,000원', kind: 'dish', price: 3000, name: '꽁치무조림(#)' },
        { meal: 'dinner', text: '※ 운영시간 : 17:00~19:00', kind: 'note', price: null, name: null },
      ],
    });
  });

  it('gives a meal whose cell is empty no lines', () => {
    expect(mealOn(coopPage, '자하연식당 3층', 'breakfast')).toEqual([]);
    expect(mealOn(coopPage, '동원관식당', 'dinner')).toEqual([]);
  });

  it('reads a closure written in a cell as a note', () => {
    // 학생회관식당's lunch cell as the page of 2026-10-03, a public holiday, wrote it (external-sources.md, 4.1).
    const holidayPage = coopPage.replace(/(<td class="lunch">)눈꽃치즈닭갈비.*?(<\/td>)/su, '$1개천절 휴무$2');

    expect(mealOn(holidayPage, '학생회관식당', 'lunch')).toEqual([
      { text: '개천절 휴무', kind: 'note', price: null, name: null },
    ]);
  });
});

describe('A heading in a cell', () => {
  it('is read with its set price, and the dishes under it stay without a kind or a price', () => {
    expect(mealOn(coopPage, '302동식당', 'lunch')).toEqual([
      { text: '<뷔페> 6,500원', kind: 'heading', price: 6500, name: null },
      { text: '뼈없는감자탕', kind: null, price: null, name: null },
      { text: '미트볼굴소스조림', kind: null, price: null, name: null },
      { text: '참깨소스냉두부', kind: null, price: null, name: null },
      { text: '치커리유자청무침', kind: null, price: null, name: null },
      { text: '오렌지', kind: null, price: null, name: null },
      { text: '그린샐러드&오늘의차', kind: null, price: null, name: null },
      { text: '※운영시간: 11:30~13:30', kind: 'note', price: null, name: null },
      { text: '※혼잡시간: 11:50~12:20', kind: 'note', price: null, name: null },
    ]);
  });

  it('is not read from a sentence between angle brackets, which is a notice', () => {
    expect(mealOn(coopPage, '* 버거운버거', 'lunch')).toContainEqual({
      text: '< 위 메뉴외에도 다양한 메뉴가 준비되어 있습니다>',
      kind: null,
      price: null,
      name: null,
    });
  });

  it('is a dish when the corner, its dishes and the price share one line', () => {
    expect(mealOn(coopPage, '예술계식당', 'lunch')).toEqual([
      {
        text: '<A코너>제육김치덮밥, 잡채, 떡꼬치구이 : 6,000원',
        kind: 'dish',
        price: 6000,
        name: '<A코너>제육김치덮밥, 잡채, 떡꼬치구이',
      },
      { text: '※ 운영시간 : 11:30 ~ 14:00', kind: 'note', price: null, name: null },
      {
        text: '<B코너>오므라이스, 까르보떡볶이, 수제소시지구이 : 6,500원',
        kind: 'dish',
        price: 6500,
        name: '<B코너>오므라이스, 까르보떡볶이, 수제소시지구이',
      },
      { text: '※ 운영시간 : 11:30 ~ 13:00', kind: 'note', price: null, name: null },
      { text: '<C코너>셀프라면,밥,김치 : 3,000원', kind: 'dish', price: 3000, name: '<C코너>셀프라면,밥,김치' },
    ]);
  });
});

// The restaurants whose names start with "* " show the prices the others do not; the collector skips them later.
describe('A price in a cell', () => {
  it('is left out when the line has several prices or a typo in its price', () => {
    expect(mealOn(coopPage, '* 버거운버거', 'lunch')).toContainEqual({
      text: '한입버거운시그니처버거 : 9,900원 / 12,400원',
      kind: 'dish',
      price: null,
      name: null,
    });
    expect(mealOn(coopPage, '* 공대간이식당', 'lunch')).toContainEqual({
      text: '호구세트 : 8,3000 원',
      kind: 'dish',
      price: null,
      name: null,
    });
    expect(mealOn(coopPage, '301동식당', 'lunch')).toContainEqual({
      text: '※ 요일별 샐러드 종류 변경(월10회 : 5,300원, 월20회 : 5,250원)',
      kind: 'note',
      price: null,
      name: null,
    });
  });

  it('is read when it is written with spaces around it', () => {
    expect(mealOn(coopPage, '* 공대간이식당', 'lunch')).toContainEqual({
      text: '짜장면 : 4,500 원',
      kind: 'dish',
      price: 4500,
      name: '짜장면',
    });
    // The page writes a no-break space after the colon.
    expect(mealOn(coopPage, '* 75-1동 4층 푸드코트', 'lunch')).toContainEqual({
      text: '1인 목살스테이크샐러드 :  12,000원',
      kind: 'dish',
      price: 12000,
      name: '1인 목살스테이크샐러드',
    });
  });
});

describe('A dish in a cell', () => {
  it('has its name without the price when the line ends with its one price', () => {
    expect(mealOn(coopPage, '301동식당', 'breakfast')).toContainEqual({
      text: '삼각김밥&토핑요거트&두유: 1,000원',
      kind: 'dish',
      price: 1000,
      name: '삼각김밥&토핑요거트&두유',
    });
  });

  it('has no name when something follows its price', () => {
    const page = coopPage.replace('수제탕수육 : 6,000원', '수제탕수육 : 6,000원 (2인 이상)');

    expect(mealOn(page, '학생회관식당', 'lunch')).toContainEqual({
      text: '수제탕수육 : 6,000원 (2인 이상)',
      kind: 'dish',
      price: 6000,
      name: null,
    });
  });
});

describe('A cell that was not filled in', () => {
  // A later day's cell can hold only the page's template (external-sources.md, 4.1).
  it.each([': | :', ' : <br> : '])('is read as an empty cell when it holds only "%s"', (template) => {
    const page = coopPage.replace(/(<td class="lunch">)눈꽃치즈닭갈비.*?(<\/td>)/su, `$1${template}$2`);

    expect(mealOn(page, '학생회관식당', 'lunch')).toEqual([]);
  });
});

describe("The dormitory's menu page", () => {
  const dormitoryPage = savedPage('dormitory-menus-2026-10-01');

  it('is read as the Co-op page is, and its names keep their building', () => {
    expect(parseMenuPage(dormitoryPage, '2026-10-01').map(({ name }) => name)).toEqual([
      '아워홈(901동)',
      '생협기숙사(919동)',
    ]);
    expect(mealOn(dormitoryPage, '아워홈(901동)', 'breakfast')).toEqual([
      { text: '세미양식부페 : 5,000원', kind: 'dish', price: 5000, name: '세미양식부페' },
      {
        text: '브로콜리스프/아욱국,고기산적조림,계란후라이,토스트,씨리얼, 흰우유/두유,그린샐러드',
        kind: null,
        price: null,
        name: null,
      },
      { text: '※운영시간 : 08:00~09:30', kind: 'note', price: null, name: null },
    ]);
  });
});

describe('A menu page that is not the one asked for', () => {
  it('is refused when it is the page of another day', () => {
    expect(() => parseMenuPage(coopPage, '2026-10-02')).toThrow('The page is not the menu of 2026-10-02');
  });

  it('is refused when it has no menu table', () => {
    expect(() => parseMenuPage(blockPage, '2026-10-01')).toThrow('The page has no menu table');
  });
});
