// The short names under the markers of the map, from the "names" level of detail on.

// A pin's label holds 8 characters at most, as the design system says.
const SHORT = 8;

// A title cut at a word's end within 8 characters: "AI 커리어 설명회" is "AI 커리어". A first word that is longer is
// cut at 8 characters.
export function shortTitle(title: string): string {
  const words = title.trim().split(/\s+/u);
  let short = '';
  for (const word of words) {
    const longer = short === '' ? word : `${short} ${word}`;
    if (longer.length > SHORT) {
      break;
    }
    short = longer;
  }
  return short === '' ? (words[0] ?? '').slice(0, SHORT) : short;
}

// A person's given name, as the frames write it under a marker: a Korean name without its first syllable, "민준" for
// "김민준"; the first word of any other name.
export function givenName(name: string): string {
  const trimmed = name.trim();
  if (/^[가-힣]{2,}$/u.test(trimmed)) {
    return trimmed.slice(1);
  }
  return trimmed.split(/\s+/u)[0] ?? trimmed;
}
