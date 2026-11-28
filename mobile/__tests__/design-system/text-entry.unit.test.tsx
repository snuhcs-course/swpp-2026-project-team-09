/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { render, screen } from '@testing-library/react-native';

import { TextEntry } from '@/design-system/text-entry';

// On Android `autoCorrect={false}` sets TYPE_TEXT_FLAG_NO_SUGGESTIONS, and Samsung Keyboard then types Hangul as loose
// letters: 'ㅋㅓㅁ' for 컴 in the friend panel's search, reported on 2026-11-28. Jest has no keyboard, so these pin
// what keeps it away: one input for the whole app, which cannot be given that prop.

// The app's types have no Node.js: what this test uses of it, typed here.
// oxlint-disable-next-line no-underscore-dangle -- Jest gives each test file its own folder by this name
declare const __dirname: string;
interface Entry {
  name: string;
  isDirectory: () => boolean;
}
const { readdirSync, readFileSync } = jest.requireActual<{
  readdirSync: (dir: string, options: { withFileTypes: true }) => Entry[];
  readFileSync: (file: string, encoding: 'utf8') => string;
}>('node:fs');
const { join, relative } = jest.requireActual<{
  join: (...parts: string[]) => string;
  relative: (from: string, to: string) => string;
}>('node:path');

// oxlint-disable-next-line no-underscore-dangle -- as above
const SOURCE = join(__dirname, '..', '..', 'src');

// `<TextInput` as JSX, not as a type argument such as `useRef<TextInput>`.
const DRAWS_TEXT_INPUT = /(?:^|[\s({>])<TextInput[\s/>]/mu;

function sourceFiles(folder: string): string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) {
      return sourceFiles(path);
    }
    return /\.tsx?$/u.test(entry.name) ? [path] : [];
  });
}

describe('TextEntry', () => {
  it("is the app's only text input: no other file draws React Native's TextInput", () => {
    const drawing = sourceFiles(SOURCE)
      .filter((path) => DRAWS_TEXT_INPUT.test(readFileSync(path, 'utf8')))
      .map((path) => relative(SOURCE, path));

    expect(drawing).toEqual(['design-system/text-entry.tsx']);
  });

  it('leaves the keyboard its suggestions, so that Hangul is composed, and is never autofilled', async () => {
    await render(<TextEntry accessibilityLabel="이름" />);

    const field = screen.getByLabelText('이름');
    expect(field.props.autoCorrect).toBeUndefined();
    expect(field.props).toMatchObject({ autoComplete: 'off', importantForAutofill: 'no', textContentType: 'none' });
  });

  it('cannot be given autoCorrect', async () => {
    // @ts-expect-error -- autoCorrect is not a prop of TextEntry
    await render(<TextEntry accessibilityLabel="이름" autoCorrect={false} />);

    expect(screen.getByLabelText('이름').props.autoCorrect).toBeUndefined();
  });
});
