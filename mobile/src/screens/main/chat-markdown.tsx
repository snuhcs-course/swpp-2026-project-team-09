/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { openBrowserAsync } from 'expo-web-browser';
import type { ReactElement } from 'react';
import { type StyleProp, StyleSheet, Text, type TextStyle, View } from 'react-native';
import { color, font, space } from '@/design-system';

// The markdown the model writes in the Assistant's bubbles, as a small hand-written subset: **bold** and __bold__,
// *italic* and _italic_, line breaks, "- ", "* " and "1. " list items, and [words](url) links to http(s) pages.
// Anything else (headings, code, tables, images, HTML, an unclosed marker) is shown as written, markers included, so
// that no words are lost. No library: one would bring a parser far larger than this subset.

// A stretch of text in one look. `url` is set only for a safe link.
export interface Run {
  text: string;
  bold: boolean;
  italic: boolean;
  url: string | null;
}

// A line as written, or a list item with its bullet or number.
export type Block = { kind: 'line'; runs: Run[] } | { kind: 'item'; marker: string; runs: Run[] };

// A link is live only for an http or https URL with a host and no spaces; javascript:, tel:, intent: and relative
// paths are not.
const SAFE_URL = /^https?:\/\/[\p{L}\p{N}.-]+(?::\d+)?(?:[/?#]\S*)?$/iu;

export function isSafeUrl(url: string): boolean {
  return SAFE_URL.test(url);
}

const WORD = /[\p{L}\p{N}]/u;

function isWordAt(text: string, at: number): boolean {
  const char = text[at];
  return char !== undefined && WORD.test(char);
}

// Where the single marker opened at `from` closes on the line, or -1. Its content is not empty and does not start or
// end with a space, and `_` neither opens nor closes inside a word (snake_case stays as written). A doubled marker is
// not a closer.
function closingSingle(text: string, from: number, marker: string): number {
  if (text[from + 1] === undefined || text[from + 1] === ' ' || text[from + 1] === marker) {
    return -1;
  }
  if (marker === '_' && isWordAt(text, from - 1)) {
    return -1;
  }
  for (let at = from + 2; at < text.length; at += 1) {
    if (text[at] !== marker) {
      continue;
    }
    if (text[at + 1] === marker) {
      at += 1;
      continue;
    }
    if (text[at - 1] === ' ' || (marker === '_' && isWordAt(text, at + 1))) {
      continue;
    }
    return at;
  }
  return -1;
}

// Where the double marker opened at `from` closes, or -1; its content is not empty and does not start or end with a
// space.
function closingDouble(text: string, from: number, marker: string): number {
  const close = text.indexOf(marker, from + 2);
  if (close <= from + 2) {
    return -1;
  }
  const inner = text.slice(from + 2, close);
  return inner.trim() === inner ? close : -1;
}

interface Look {
  bold: boolean;
  italic: boolean;
}

function push(runs: Run[], text: string, look: Look, url: string | null = null): void {
  if (text === '') {
    return;
  }
  const last = runs.at(-1);
  if (
    last !== undefined &&
    url === null &&
    last.url === null &&
    last.bold === look.bold &&
    last.italic === look.italic
  ) {
    last.text += text;
    return;
  }
  runs.push({ text, bold: look.bold, italic: look.italic, url });
}

// Where the URL started at `from` ends: the ")" that balances its own parentheses, or -1.
function closingParen(text: string, from: number): number {
  let depth = 0;
  for (let at = from; at < text.length; at += 1) {
    if (text[at] === '(') {
      depth += 1;
    } else if (text[at] === ')') {
      if (depth === 0) {
        return at;
      }
      depth -= 1;
    }
  }
  return -1;
}

// A link at `from` ("[words](url)"): its words, its URL and where it ends, or null when it is not one.
function linkAt(text: string, from: number): { words: string; url: string; end: number } | null {
  const middle = text.indexOf('](', from + 1);
  if (middle === -1) {
    return null;
  }
  const close = closingParen(text, middle + 2);
  const words = text.slice(from + 1, middle);
  if (close === -1 || words === '' || words.includes('[')) {
    return null;
  }
  return { words, url: text.slice(middle + 2, close).trim(), end: close + 1 };
}

// The runs of one line. Bold may hold italics and links, italics may hold links, and a link's words are plain.
function inline(text: string, look: Look, runs: Run[] = []): Run[] {
  let plain = '';
  const flush = (): void => {
    push(runs, plain, look);
    plain = '';
  };
  let at = 0;
  while (at < text.length) {
    const char = text[at] ?? '';
    const double = text.slice(at, at + 2);
    if ((double === '**' || double === '__') && !look.bold) {
      const close = closingDouble(text, at, double);
      if (close !== -1 && !(double === '__' && (isWordAt(text, at - 1) || isWordAt(text, close + 2)))) {
        flush();
        inline(text.slice(at + 2, close), { ...look, bold: true }, runs);
        at = close + 2;
        continue;
      }
    }
    if ((char === '*' || char === '_') && double !== '**' && double !== '__' && !look.italic) {
      const close = closingSingle(text, at, char);
      if (close !== -1) {
        flush();
        inline(text.slice(at + 1, close), { ...look, italic: true }, runs);
        at = close + 1;
        continue;
      }
    }
    if (char === '[') {
      const link = linkAt(text, at);
      if (link !== null) {
        flush();
        push(runs, link.words, look, isSafeUrl(link.url) ? link.url : null);
        at = link.end;
        continue;
      }
    }
    // A marker that opens nothing, or a doubled one that does not close, is kept as written.
    const kept = double === '**' || double === '__' ? double : char;
    plain += kept;
    at += kept.length;
  }
  flush();
  return runs;
}

const BULLET = /^\s*[-*] (.*)$/su;
const NUMBERED = /^\s*(\d{1,3})\. (.*)$/su;

// The text as blocks: one per line, a list item with its bullet or number.
export function parseMarkdown(text: string): Block[] {
  const plainLook = { bold: false, italic: false };
  return text.split('\n').map((line): Block => {
    const bullet = BULLET.exec(line);
    if (bullet !== null) {
      return { kind: 'item', marker: '•', runs: inline(bullet[1] ?? '', plainLook) };
    }
    const numbered = NUMBERED.exec(line);
    if (numbered !== null) {
      return { kind: 'item', marker: `${numbered[1] ?? ''}.`, runs: inline(numbered[2] ?? '', plainLook) };
    }
    return { kind: 'line', runs: inline(line, plainLook) };
  });
}

function runsText(runs: readonly Run[]): string {
  return runs.map(({ text }) => text).join('');
}

// The text without the markers: what a screen reader reads. A numbered item keeps its number.
export function markdownLabel(text: string): string {
  return parseMarkdown(text)
    .map((block) => (block.kind === 'item' && block.marker !== '•' ? `${block.marker} ` : '') + runsText(block.runs))
    .join('\n');
}

function RunText({ run }: { run: Run }): ReactElement {
  const look = [run.bold && styles.bold, run.italic && styles.italic];
  const { url } = run;
  if (url === null) {
    return <Text style={look}>{run.text}</Text>;
  }
  return (
    <Text
      accessibilityRole="link"
      onPress={() => {
        void openBrowserAsync(url).catch(() => null);
      }}
      style={[look, styles.link]}
    >
      {run.text}
    </Text>
  );
}

// Consecutive lines as one text with their line breaks, and each list item as a row with a hanging indent.
type Group = { kind: 'lines'; lines: Run[][] } | { kind: 'item'; marker: string; runs: Run[] };

function grouped(blocks: readonly Block[]): Group[] {
  const groups: Group[] = [];
  for (const block of blocks) {
    const last = groups.at(-1);
    if (block.kind === 'item') {
      groups.push({ kind: 'item', marker: block.marker, runs: block.runs });
    } else if (last?.kind === 'lines') {
      last.lines.push(block.runs);
    } else {
      groups.push({ kind: 'lines', lines: [block.runs] });
    }
  }
  return groups;
}

interface ChatMarkdownProps {
  text: string;
  // The bubble's words style.
  style: StyleProp<TextStyle>;
}

// The Assistant's words, with the subset rendered. The whole is one accessible element labelled without the markers.
export function ChatMarkdown({ text: words, style }: ChatMarkdownProps): ReactElement {
  const groups = grouped(parseMarkdown(words));
  return (
    <View accessibilityLabel={markdownLabel(words)} accessible style={styles.blocks}>
      {groups.map((group, index) =>
        group.kind === 'lines' ? (
          <Text key={index} style={style}>
            {group.lines.flatMap((runs, line) => [
              ...(line === 0 ? [] : ['\n']),
              ...runs.map((run, at) => <RunText key={`${String(line)}-${String(at)}`} run={run} />),
            ])}
          </Text>
        ) : (
          <View key={index} style={styles.item}>
            <Text style={[style, styles.marker]}>{group.marker}</Text>
            <Text style={[style, styles.itemText]}>
              {group.runs.map((run, at) => (
                <RunText key={at} run={run} />
              ))}
            </Text>
          </View>
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  blocks: { gap: space[1] / 2 },
  bold: { fontFamily: font.semiBold },
  italic: { fontStyle: 'italic' },
  link: { color: color.snuBlue, textDecorationLine: 'underline' },
  item: { flexDirection: 'row', gap: space[1] },
  marker: { minWidth: space[4], textAlign: 'right' },
  itemText: { flex: 1 },
});
