/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// How every search list of the app matches the words typed, so that Hangul narrows the list while a syllable is
// still being composed: '커' and 'ㅋ' already find 컴퓨터공학부, as '가바' finds 가방 on its way there.

const FIRST = 0xac00;
const LAST = 0xd7a3;
const INITIALS = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const VOWELS = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';
// After the syllables with no final consonant.
const FINALS = 'ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ';

// A compound letter as the keys that type it, since a keyboard sends them one by one: 고 comes before 과, 달 before 닭.
const KEYS: Readonly<Record<string, string>> = {
  ㅘ: 'ㅗㅏ',
  ㅙ: 'ㅗㅐ',
  ㅚ: 'ㅗㅣ',
  ㅝ: 'ㅜㅓ',
  ㅞ: 'ㅜㅔ',
  ㅟ: 'ㅜㅣ',
  ㅢ: 'ㅡㅣ',
  ㄳ: 'ㄱㅅ',
  ㄵ: 'ㄴㅈ',
  ㄶ: 'ㄴㅎ',
  ㄺ: 'ㄹㄱ',
  ㄻ: 'ㄹㅁ',
  ㄼ: 'ㄹㅂ',
  ㄽ: 'ㄹㅅ',
  ㄾ: 'ㄹㅌ',
  ㄿ: 'ㄹㅍ',
  ㅀ: 'ㄹㅎ',
  ㅄ: 'ㅂㅅ',
};

function syllable(letter: string): number | null {
  const code = letter.codePointAt(0) ?? 0;
  return code >= FIRST && code <= LAST ? code - FIRST : null;
}

function keys(letter: string): string {
  return KEYS[letter] ?? letter;
}

// Spaces and '#' do not count, nor case; NFC joins Hangul that came as separate jamo.
function plain(words: string): string {
  return words.normalize('NFC').replaceAll(/[\s#]/gu, '').toLowerCase();
}

// The words as the keys typed for them: 컴퓨터 → ㅋㅓㅁㅍㅠㅌㅓ.
function typed(words: string): string {
  return Array.from(words, (letter) => {
    const index = syllable(letter);
    if (index === null) {
      return keys(letter);
    }
    const initial = INITIALS.charAt(Math.floor(index / 588));
    const vowel = VOWELS.charAt(Math.floor((index % 588) / 28));
    const final = index % 28 === 0 ? '' : FINALS.charAt((index % 28) - 1);
    return `${initial}${keys(vowel)}${keys(final)}`;
  }).join('');
}

// Each syllable's first consonant: 컴퓨터 → ㅋㅍㅌ.
function initials(words: string): string {
  return Array.from(words, (letter) => {
    const index = syllable(letter);
    return index === null ? letter : INITIALS.charAt(Math.floor(index / 588));
  }).join('');
}

const ONLY_CONSONANTS = /^[ㄱ-ㅎ]+$/u;

// Whether any of the texts holds the words. Words of consonants alone are read as initials, 'ㄱㅎ' finding 공학;
// other words match as the keys typed for them, so a syllable still being composed matches the ones it can become.
// No words match everything.
export function matchesWords(words: string, texts: readonly string[]): boolean {
  const wanted = plain(words);
  if (wanted === '') {
    return true;
  }
  if (ONLY_CONSONANTS.test(wanted)) {
    return texts.some((text) => initials(plain(text)).includes(wanted));
  }
  const keysWanted = typed(wanted);
  return texts.some((text) => typed(plain(text)).includes(keysWanted));
}
