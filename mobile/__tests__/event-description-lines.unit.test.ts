/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { descriptionLines } from '@/screens/events/description-lines';

// The 행사 sheet lays a description out by its own lines (P06 ticket 14): a block per line, a run of blank lines as one
// wider gap, none at the start or the end, and each line's words as the text has them.
describe("a description's lines", () => {
  it('makes each line a block, and marks the one after a blank line', () => {
    expect(descriptionLines('안녕하세요.\n워크숍을 엽니다.\n\n일시: 내일 10:00')).toEqual([
      { words: '안녕하세요.', afterBlank: false },
      { words: '워크숍을 엽니다.', afterBlank: false },
      { words: '일시: 내일 10:00', afterBlank: true },
    ]);
  });

  it('takes a run of blank lines, white space alone included, as one', () => {
    expect(descriptionLines('첫 줄\n\n \n\t\n둘째 줄')).toEqual([
      { words: '첫 줄', afterBlank: false },
      { words: '둘째 줄', afterBlank: true },
    ]);
  });

  it('drops the blank lines at the start and the end', () => {
    expect(descriptionLines('\n \n첫 줄\n둘째 줄\n\n')).toEqual([
      { words: '첫 줄', afterBlank: false },
      { words: '둘째 줄', afterBlank: false },
    ]);
  });

  it("keeps each line's words, its spaces included, and reads \\r\\n as one line break", () => {
    expect(descriptionLines('  ○ 장소:  103동 444호 \r\n- 문의: 담당조교')).toEqual([
      { words: '  ○ 장소:  103동 444호 ', afterBlank: false },
      { words: '- 문의: 담당조교', afterBlank: false },
    ]);
  });

  it('has a single block for a single line, and none for blank lines alone', () => {
    expect(descriptionLines('현직자가 들려주는 AI 직무 이야기')).toEqual([
      { words: '현직자가 들려주는 AI 직무 이야기', afterBlank: false },
    ]);
    expect(descriptionLines('')).toEqual([]);
    expect(descriptionLines('\n \n')).toEqual([]);
  });
});
