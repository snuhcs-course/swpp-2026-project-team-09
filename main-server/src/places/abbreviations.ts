/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-26  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { canBeChoseong, getChoseong } from 'es-hangul';

// The short forms students say a campus name as, made by rules from the name alone (P07 ticket 01, research note 08
// §2): 학생회관 is 학관, 중앙도서관 본관 is 중도, 체육관 is 체육. Nothing here is written by hand per Place; the matcher
// computes the forms when the catalog loads. A form is at least two syllables, and never the name itself.

const HANGUL_WORD = /^[가-힣]+$/u;
const SYLLABLE = /^[가-힣]$/u;
const BRACKETS = /[([]([^)\]]*)[)\]]/gu;
// SK경영관 is said as 경영관.
const LATIN_PREFIX = /^[A-Za-z&.]+(?=[가-힣])/u;
// 제1공학관 is a 공학관, and 자연과학관4 a 자연과학관.
const ORDINAL = /^제\d+/u;
const TRAILING_NUMBER = /[\s\d\-ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩⅪⅫ]+$/u;
const SPACES = /\s+/gu;
// 및 joins two names into one.
const CONJUNCTION = /\s*및\s*/gu;

// What a building name ends in, the longest first, so that 학술정보관 is not read as 학술정보 and 관.
const HEADS = [
  '학술정보관',
  '어린이집',
  '기숙사',
  '도서관',
  '연결동',
  '연구소',
  '연구동',
  '연구원',
  '대학원',
  '생활관',
  '기념관',
  '실험동',
  '강의동',
  '교육관',
  '운동장',
  '아파트',
  '회관',
  '센터',
  '센타',
  '식당',
  '대학',
  '창고',
  '병원',
  '단지',
  '시설',
  '관',
  '동',
  '원',
  '소',
  '실',
  '장',
  '역',
].toSorted((a, b) => b.length - a.length);

// Words of three syllables or more that a cut into pairs would split: proper nouns and loanwords of the campus.
const MORPHEMES = [
  '커뮤니케이션',
  '인터내셔널',
  '멀티미디어',
  '매니지먼트',
  '인문사회계',
  '사이언스',
  '뉴미디어',
  '엔지니어',
  '파워플랜트',
  '어린이집',
  '느티나무',
  '자하연',
  '버들골',
  '서당골',
  '유회진',
  '관악사',
  '포스코',
  '스포츠',
  '글로벌',
  '데이터',
  '반도체',
  '신소재',
  '에너지',
  '신기술',
  '차세대',
  '자동차',
  '게스트',
  '하우스',
  '외국인',
  '테니스',
  '이공계',
  '농생명',
  '아파트',
  '규장각',
  '한국학',
  '다목적',
  '위험물',
  '아시아',
  '연구소',
  '사범대',
  '자연대',
  '수의대',
  '서울대',
  '김철수',
  '가속기',
  '정구장',
  '배터리',
].toSorted((a, b) => b.length - a.length);

// The tail a name is said without (R6): 체육관 is 체육, 테니스장 is 테니스.
const TAILS = ['센터', '센타', '관', '동', '원', '소', '장', '역'];

// Hangul syllables are single code points, so code points are syllables.
export function syllablesOf(text: string): string[] {
  return Array.from(text);
}

// Whether every character is a consonant on its own, as ㅎㄱ typed for 학관.
export function isChoseongOnly(text: string): boolean {
  const characters = syllablesOf(text);
  return characters.length > 0 && characters.every((character) => canBeChoseong(character));
}

// Whether the text mixes consonants and syllables, as ㅎ관 typed for 학관.
export function isMixedChoseong(text: string): boolean {
  const characters = syllablesOf(text);
  return (
    characters.some((character) => canBeChoseong(character)) &&
    characters.every((character) => canBeChoseong(character) || SYLLABLE.test(character))
  );
}

// The 초성 of each syllable: 학생회관 gives ㅎㅅㅎㄱ. Other characters stay as they are.
export function choseongOf(text: string): string {
  return getChoseong(text, { keepNonHangul: true });
}

function squeezed(text: string): string {
  return text.replaceAll(CONJUNCTION, ' ').replaceAll(SPACES, ' ').trim();
}

// The names a Place's name is read as: the name without its brackets, ordinal and trailing number, the bracket text
// when it names something (서당골 of 제4식당(서당골)), and the Hangul after a Latin prefix (경영관 of SK경영관) when
// more than a head is left. Each keeps its spaces between words.
export function nameVariants(name: string): string[] {
  const normalised = name.normalize('NFC').replaceAll(SPACES, ' ').trim();
  const brackets = [...normalised.matchAll(BRACKETS)]
    .map((match) => squeezed(match[1] ?? ''))
    .filter((text) => text.length >= 2 && HANGUL_WORD.test(text.replaceAll(SPACES, '')));
  const base = squeezed(normalised.replaceAll(BRACKETS, ' ')).replace(ORDINAL, '').replace(TRAILING_NUMBER, '').trim();
  const variants = [...(base === '' ? [] : [base]), ...brackets];
  const withoutPrefix = variants
    .map((variant) => variant.replace(LATIN_PREFIX, ''))
    .filter((rest, index) => rest !== variants[index] && !HEADS.includes(rest.replaceAll(SPACES, '')));
  return [...new Set([...variants, ...withoutPrefix])];
}

// The morpheme the list knows at `at`, or a pair of syllables.
function chunkAt(rest: string, at: number): string {
  const known = MORPHEMES.find((morpheme) => rest.startsWith(morpheme, at));
  return rest.slice(at, at + (known?.length ?? 2));
}

interface Chunked {
  // The chunks in order, the head last when there is one.
  chunks: string[];
  head: string | null;
}

// A word's chunks: its head, and before it the morphemes the list knows and pairs of syllables for the rest. A word
// that is a head, or a syllable and a head (본관), is one chunk, and a syllable left alone joins the chunk before it,
// so that 자하연 is one chunk and not 자하 and 연.
export function chunksOf(word: string): Chunked {
  const head = HEADS.find((candidate) => word.endsWith(candidate)) ?? null;
  if (head === word) {
    return { chunks: [word], head };
  }
  if (head !== null && word.length - head.length === 1) {
    return { chunks: [word], head: null };
  }
  const rest = head === null ? word : word.slice(0, -head.length);
  const chunks: string[] = [];
  for (let at = 0; at < rest.length; at += chunks.at(-1)?.length ?? 2) {
    chunks.push(chunkAt(rest, at));
  }
  const last = chunks.at(-1);
  if (chunks.length > 1 && last !== undefined && last.length === 1) {
    chunks.splice(-2, 2, (chunks.at(-2) ?? '') + last);
  }
  return { chunks: head === null ? chunks : [...chunks, head], head };
}

// The forms of one unit from its chunks (note 08 §2): a whole name, or one word of it, which `word` says.
function formsOf({ chunks, head }: Chunked, word: boolean): string[] {
  const whole = chunks.join('');
  // A head of one syllable (관, 동) gives no initial: 관정관 is not 관관.
  const named = head !== null && head.length === 1 ? chunks.slice(0, -1) : chunks;
  const initials = named.map((chunk) => chunk.slice(0, 1));
  const last = whole.slice(-1);
  const forms = [
    // R1: the first syllable of each chunk, and R1′: the first two of them.
    initials.join(''),
    initials.slice(0, 2).join(''),
    // R3: the first chunk alone.
    chunks[0] ?? '',
  ];
  if (syllablesOf(whole).length >= 4) {
    // R2: the first and the last syllable, of a name long enough for them to stand for it.
    forms.push(initials.slice(0, 1).join('') + last);
  }
  if (chunks.length >= 3) {
    // R4: two initials and the last syllable, or the head's first.
    forms.push(initials.slice(0, 2).join('') + last);
    if (head !== null) {
      forms.push(initials.slice(0, 2).join('') + head.slice(0, 1));
      // R7: the word without its first chunk, which is often a sponsor: 두산인문관 is an 인문관.
      if (word) {
        forms.push(chunks.slice(1).join(''));
      }
    }
  }
  // R6: the word without its tail.
  const tail = TAILS.find((candidate) => whole.endsWith(candidate) && whole.length - candidate.length >= 2);
  if (word && tail !== undefined) {
    forms.push(whole.slice(0, -tail.length));
  }
  return forms.filter((form) => syllablesOf(form).length >= 2 && form !== whole);
}

// Every short form of a name, over each of its variants: the variant itself when it differs from the name, the forms
// of the whole and, for a name of several words, each word and its forms. A word with Latin letters or digits inside
// gives no forms.
export function abbreviations(name: string): string[] {
  const own = name.normalize('NFC').replaceAll(SPACES, '');
  const forms = new Set<string>();
  for (const variant of nameVariants(name)) {
    const joined = variant.replaceAll(SPACES, '');
    if (joined !== own) {
      forms.add(joined);
    }
    const words = variant.split(' ').filter((word) => HANGUL_WORD.test(word));
    if (words.length === 0) {
      continue;
    }
    const chunked = words.map((word) => chunksOf(word));
    if (words.length === 1) {
      for (const form of formsOf(chunked[0] ?? chunksOf(variant), true)) {
        forms.add(form);
      }
      continue;
    }
    const whole: Chunked = { chunks: chunked.flatMap(({ chunks }) => chunks), head: chunked.at(-1)?.head ?? null };
    for (const form of formsOf(whole, false)) {
      forms.add(form);
    }
    for (const [index, word] of words.entries()) {
      if (syllablesOf(word).length >= 2) {
        forms.add(word);
      }
      for (const form of formsOf(chunked[index] ?? chunksOf(word), true)) {
        forms.add(form);
      }
    }
  }
  forms.delete(own);
  return [...forms];
}
