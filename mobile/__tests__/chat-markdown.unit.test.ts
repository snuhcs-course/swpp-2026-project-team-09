/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { type Block, isSafeUrl, markdownLabel, parseMarkdown, type Run } from '@/screens/main/chat-markdown';

// The markdown subset of the Assistant's bubbles, as a pure function from the text to blocks of styled runs.

function run(text: string, look: Partial<Omit<Run, 'text'>> = {}): Run {
  return { text, bold: false, italic: false, url: null, ...look };
}

function line(...runs: Run[]): Block {
  return { kind: 'line', runs };
}

describe('parseMarkdown, inline', () => {
  it('reads **bold** and __bold__ without their markers', () => {
    expect(parseMarkdown('관정관은 **09:00**부터, __7층__이에요')).toEqual([
      line(run('관정관은 '), run('09:00', { bold: true }), run('부터, __7층__이에요')),
    ]);
    expect(parseMarkdown('__굵게__ 써요')).toEqual([line(run('굵게', { bold: true }), run(' 써요'))]);
  });

  it('reads *italic* and _italic_, and leaves snake_case and a lone star as written', () => {
    expect(parseMarkdown('*참고* 하세요 _꼭_')).toEqual([
      line(run('참고', { italic: true }), run(' 하세요 '), run('꼭', { italic: true })),
    ]);
    expect(parseMarkdown('use_desc_options 와 3 * 4 * 5')).toEqual([line(run('use_desc_options 와 3 * 4 * 5'))]);
  });

  it('keeps italics inside bold', () => {
    expect(parseMarkdown('**아주 *중요한* 말**')).toEqual([
      line(run('아주 ', { bold: true }), run('중요한', { bold: true, italic: true }), run(' 말', { bold: true })),
    ]);
  });
});

describe('parseMarkdown, its lines and links', () => {
  it('keeps each line break', () => {
    expect(parseMarkdown('첫 줄\n\n셋째 줄')).toEqual([line(run('첫 줄')), line(), line(run('셋째 줄'))]);
  });

  it('reads "- ", "* " and "1. " lines as list items', () => {
    expect(parseMarkdown('- **7층** 열람실\n* 8층 열람실\n12. 마지막')).toEqual([
      { kind: 'item', marker: '•', runs: [run('7층', { bold: true }), run(' 열람실')] },
      { kind: 'item', marker: '•', runs: [run('8층 열람실')] },
      { kind: 'item', marker: '12.', runs: [run('마지막')] },
    ]);
  });

  it('makes [words](url) a link for an https or http URL', () => {
    expect(parseMarkdown('[도서관 홈페이지](https://lib.snu.ac.kr/hours?x=1)를 보세요')).toEqual([
      line(run('도서관 홈페이지', { url: 'https://lib.snu.ac.kr/hours?x=1' }), run('를 보세요')),
    ]);
    expect(parseMarkdown('[옛 주소](http://snu.ac.kr)')).toEqual([line(run('옛 주소', { url: 'http://snu.ac.kr' }))]);
  });

  it('shows the words of a link of any other scheme as plain text, and a bare URL as text', () => {
    for (const url of ['javascript:alert(1)', 'tel:0288', 'intent://scan#Intent;end', '/relative/path', 'https://']) {
      expect(parseMarkdown(`[누르기](${url})`)).toEqual([line(run('누르기'))]);
    }
    expect(parseMarkdown('https://snu.ac.kr 에서')).toEqual([line(run('https://snu.ac.kr 에서'))]);
    expect(isSafeUrl('HTTPS://snu.ac.kr')).toBe(true);
    expect(isSafeUrl('https://snu.ac.kr/a b')).toBe(false);
  });

  it('shows an unclosed ** as written', () => {
    expect(parseMarkdown('**열려만 있어요')).toEqual([line(run('**열려만 있어요'))]);
    expect(parseMarkdown('별 ** 두 개')).toEqual([line(run('별 ** 두 개'))]);
  });

  it('keeps headings, code, tables, images and HTML as written', () => {
    for (const text of ['# 관정관', '## 이용 시간', '`code`', '| a | b |', '<b>굵게</b>', '> 인용']) {
      expect(parseMarkdown(text)).toEqual([line(run(text))]);
    }
    // An image's ! stays, and its words show; nothing is lost but the markers the subset reads.
    expect(parseMarkdown('![사진](https://x.kr/a.png)')).toEqual([
      line(run('!'), run('사진', { url: 'https://x.kr/a.png' })),
    ]);
  });
});

describe('markdownLabel', () => {
  it('is the text without the markers, numbered items keeping their numbers', () => {
    expect(markdownLabel('**관정관** 이용 안내\n- *7층* 열람실\n1. [예약](https://lib.snu.ac.kr)')).toBe(
      '관정관 이용 안내\n7층 열람실\n1. 예약',
    );
  });
});
