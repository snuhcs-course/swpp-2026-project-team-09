/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-26  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import {
  abbreviations,
  choseongOf,
  chunksOf,
  isChoseongOnly,
  isMixedChoseong,
  nameVariants,
  syllablesOf,
} from '../src/places/abbreviations.js';

// The short forms the rules make from a name (P07 ticket 01), on research note 08's examples: what a student says for
// a Place, and the general words the same rules reach and miss.

describe('abbreviations', () => {
  it.each([
    ['학생회관', '학관'],
    ['중앙도서관 본관', '중도'],
    ['중앙도서관 관정관', '중도'],
    ['중앙도서관 관정관', '관정'],
    ['농업생명과학대학', '농생대'],
    ['제3학생식당', '학식'],
    ['체육관', '체육'],
  ])('makes %s into %s', (name, form) => {
    expect(abbreviations(name)).toContain(form);
  });

  it.each([
    ['배드민턴', '배민'],
    ['코인 노래방', '코노'],
    ['밥 약속', '밥약'],
  ])('makes the general word %s into %s by the same rules', (word, form) => {
    expect(abbreviations(word)).toContain(form);
  });

  // Contractions merge syllables, and 스터디 has three, which the pair cut splits. Learning covers these later.
  it.each([
    ['보드게임', '보겜'],
    ['아르바이트', '알바'],
    ['스터디카페', '스카'],
  ])('does not make %s into %s', (word, form) => {
    expect(abbreviations(word)).not.toContain(form);
  });
});

describe('abbreviations of a name as the catalog writes it', () => {
  it('reads the bracket text as a second name', () => {
    expect(abbreviations('제4식당(서당골)')).toEqual(expect.arrayContaining(['서당골', '식당']));
    expect(abbreviations('(관악사)학부 생활관')).toEqual(expect.arrayContaining(['관악사', '학관', '학부']));
    expect(abbreviations('인문관연결동(1동-2동)')).not.toContain('1동-2동');
  });

  it('reads the name without its ordinal, trailing number or Latin prefix', () => {
    expect(abbreviations('제1공학관')).toContain('공학관');
    expect(abbreviations('공학관3')).toContain('공학관');
    expect(abbreviations('신양학술정보관Ⅲ')).toContain('신양학술정보관');
    expect(abbreviations('SK경영관')).toContain('경영관');
    // What is left of LG연구동 is a head alone, which names nothing.
    expect(abbreviations('LG연구동')).toEqual([]);
  });

  it('reads a sponsor off the front of a name', () => {
    expect(abbreviations('두산인문관')).toContain('인문관');
    expect(abbreviations('호암교수회관')).toContain('교수회관');
  });

  it('gives each word of a name of several words', () => {
    expect(abbreviations('유회진 학술정보관')).toEqual(expect.arrayContaining(['유회진', '학술정보관', '학관']));
  });

  it('gives no form of one syllable and never the name itself', () => {
    for (const name of ['학생회관', '체육관', '공관', '자하연', '중앙도서관 본관', '관악사후생관']) {
      for (const form of abbreviations(name)) {
        expect(syllablesOf(form).length, `${name} → ${form}`).toBeGreaterThanOrEqual(2);
        expect(form, name).not.toBe(name.replaceAll(/\s+/gu, ''));
      }
    }
    expect(abbreviations('공관')).toEqual([]);
  });

  it('gives nothing for a name with digits inside', () => {
    expect(abbreviations('근대법학교육100주년기념관')).toEqual([]);
  });
});

describe('nameVariants', () => {
  it('drops a bracket that names nothing, and 및 between two names', () => {
    expect(nameVariants('체육문화교육연구동(71-1동)')).toEqual(['체육문화교육연구동']);
    expect(nameVariants('데이터사이언스대학원 및 공과대학 강의동 1')).toEqual(['데이터사이언스대학원 공과대학 강의동']);
    expect(nameVariants('LG경영관(경영연구관및산학협동관)')).toEqual(['LG경영관', '경영연구관 산학협동관', '경영관']);
  });
});

describe('chunksOf', () => {
  it('cuts a word into its morphemes and head', () => {
    expect(chunksOf('학생회관')).toEqual({ chunks: ['학생', '회관'], head: '회관' });
    expect(chunksOf('농업생명과학대학')).toEqual({ chunks: ['농업', '생명', '과학', '대학'], head: '대학' });
    expect(chunksOf('자하연식당')).toEqual({ chunks: ['자하연', '식당'], head: '식당' });
    expect(chunksOf('포스코스포츠센터')).toEqual({ chunks: ['포스코', '스포츠', '센터'], head: '센터' });
    expect(chunksOf('본관')).toEqual({ chunks: ['본관'], head: null });
    expect(chunksOf('생활관')).toEqual({ chunks: ['생활관'], head: '생활관' });
  });
});

describe('초성', () => {
  it('tells consonants alone from a mixed form and from syllables', () => {
    expect(isChoseongOnly('ㅎㄱ')).toBe(true);
    expect(isChoseongOnly('ㅎ관')).toBe(false);
    expect(isChoseongOnly('')).toBe(false);
    expect(isMixedChoseong('ㅎ관')).toBe(true);
    expect(isMixedChoseong('학관')).toBe(false);
    expect(isMixedChoseong('ㅎㄱ')).toBe(true);
  });

  it('gives the 초성 of a name', () => {
    expect(choseongOf('학생회관')).toBe('ㅎㅅㅎㄱ');
    expect(choseongOf('sk경영관')).toBe('skㄱㅇㄱ');
  });
});
