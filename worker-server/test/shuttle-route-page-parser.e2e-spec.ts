// AI-generated with Claude Opus 5.5, 2026-10-04, prompted by TaeHyun79, reviewed by fyoon46 in #31
import { parseRoutePage } from '../src/shuttle/route-page.parser.js';
import { blockPage, savedPage } from './pages.js';

const routePage = savedPage('shuttle-stops-2026-10-02');

describe("The operator's route page", () => {
  it('gives the stops in loop order, each at its place on the drawing', () => {
    expect(parseRoutePage(routePage).stops).toEqual([
      { name: '정문', left: 157, top: 35 },
      { name: '법과대', left: 195, top: 86 },
      { name: '자연대', left: 195, top: 136 },
      { name: '농생대', left: 195, top: 188 },
      { name: '38동', left: 195, top: 239 },
      { name: '신소재공동연구소', left: 195, top: 289 },
      { name: '302동', left: 195, top: 341 },
      { name: '301동', left: 157, top: 393 },
      { name: '유전공학연구소', left: 116, top: 341 },
      { name: '교수회관', left: 116, top: 289 },
      { name: '기숙사삼거리', left: 116, top: 239 },
      { name: '국제대학원', left: 116, top: 188 },
      { name: '수의대', left: 116, top: 136 },
      { name: '경영대', left: 116, top: 86 },
    ]);
  });

  it('gives the service hours as the page writes them, a line for each of its lines, with plain spaces', () => {
    expect(parseRoutePage(routePage).serviceHours).toBe(
      [
        '· 운행시간 안내(주말,공휴일,개교기념일 미운행)',
        '-  학기 8:00~21:00 / 계절학기, 방학 8:00~18:00',
        '※ 학기 8:00~19:00 (5~7분), 19:00~21:00 (20분 간격)',
        '※ 계절학기 5~7분 간격 / 방학 10분 간격',
      ].join('\n'),
    );
  });
});

describe('A page that is not the route page the parser knows', () => {
  it("is refused when it is the firewall's block page", () => {
    expect(() => parseRoutePage(blockPage)).toThrow('The page has no stops of the route');
  });

  it('is refused when a stop has no place on the drawing', () => {
    // 경영대 without its inline style, as if the page moved the places to a stylesheet.
    const page = routePage.replace('style="position: absolute; top: 86px; left:116px;"', '');

    expect(() => parseRoutePage(page)).toThrow('The page has a stop without its name or place on the drawing: 14');
  });

  it('is refused when it writes no service hours', () => {
    // Without the header's one li, which holds the service hours.
    const page = routePage.replace(/<li>.*?<\/li>/su, '');

    expect(() => parseRoutePage(page)).toThrow('The page has no service hours');
  });
});
