// The short names under the markers of the map, from the "names" level of detail on.

// A pin's label holds 8 characters at most, as the design system says.
const SHORT = 8;

const JOINER = 0x200d;

function within(code: number, first: number, last: number): boolean {
  return code >= first && code <= last;
}

// A flag is two of these.
function isFlagLetter(code: number): boolean {
  return within(code, 0x1f1e6, 0x1f1ff);
}

// What belongs to the code point before it: a joiner, a variation selector, a combining mark, a skin tone, a tag.
function continues(code: number): boolean {
  return (
    code === JOINER ||
    within(code, 0xfe00, 0xfe0f) ||
    within(code, 0x0300, 0x036f) ||
    within(code, 0x20d0, 0x20ff) ||
    within(code, 0x1f3fb, 0x1f3ff) ||
    within(code, 0xe0020, 0xe007f)
  );
}

// The characters of some words as a reader sees them: an emoji made of several code points, such as a family, a
// flag or a face with a skin tone, is one. A cut between two of these never falls inside a character.
export function characters(words: string): string[] {
  const whole: string[] = [];
  for (const point of words) {
    const code = point.codePointAt(0) ?? 0;
    const last = whole.at(-1) ?? '';
    const joined = last.codePointAt(last.length - 1) === JOINER;
    // One flag letter alone, which is as long as this one: the two make a flag.
    const flag = isFlagLetter(code) && last.length === point.length && isFlagLetter(last.codePointAt(0) ?? 0);
    if (last !== '' && (continues(code) || joined || flag)) {
      whole[whole.length - 1] = `${last}${point}`;
    } else {
      whole.push(point);
    }
  }
  return whole;
}

// A title cut at a word's end within 8 characters: "AI 커리어 설명회" is "AI 커리어". A first word that is longer is
// cut at 8 characters.
export function shortTitle(title: string): string {
  const words = title.trim().split(/\s+/u);
  let short = '';
  for (const word of words) {
    const longer = short === '' ? word : `${short} ${word}`;
    if (characters(longer).length > SHORT) {
      break;
    }
    short = longer;
  }
  return short === ''
    ? characters(words[0] ?? '')
        .slice(0, SHORT)
        .join('')
    : short;
}

// A person's name as the frames write it under a marker: a Korean name of three syllables without its first, the
// family name, "민준" for "김민준". Of any other name no part is known to be the family name, so it is whole.
export function givenName(name: string): string {
  const trimmed = name.trim();
  return /^[가-힣]{3}$/u.test(trimmed) ? trimmed.slice(1) : trimmed;
}

const HANGUL_FIRST = 0xac00;
const HANGUL_LAST = 0xd7a3;
const FINALS = 28;

// "김민준과", "최유나와": the particle follows the last syllable's final consonant.
export function withParticle(words: string): string {
  const last = words.codePointAt(words.length - 1) ?? 0;
  const open = last >= HANGUL_FIRST && last <= HANGUL_LAST && (last - HANGUL_FIRST) % FINALS === 0;
  return `${words}${open ? '와' : '과'}`;
}
