/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { MapPin } from './map-pin';
import { color, mapText, radius, shadow, space, text } from './tokens';

export type AnswerSymbol =
  | { type: 'me' }
  // `dashed`: the position comes from the Timetable. `badge`: a "?" (`waiting`) or a "✓" (`accepted`) at the face's
  // upper right; the caller says what it means.
  | { type: 'face'; name: string; dashed: boolean; badge?: FaceBadge }
  | { type: 'dot'; role: 'pick' | 'candidate' | 'dropped' | 'next'; number: number | null };

export type FaceBadge = 'waiting' | 'accepted';

export type LabelSide = 'above' | 'below' | 'left' | 'right';

export interface AnswerLabel {
  side: LabelSide;
  tone: 'pick' | 'candidate' | 'dropped' | 'next' | 'person' | 'meeting';
  title: string;
  // A second line, under the title.
  line: string | null;
  // A number badge before the title, when the mark's own dot is not drawn.
  number: number | null;
  // How much further than the gap a label at the left or the right stands from the symbol box, in points, so that it
  // shares an edge with the labels of neighbouring marks. Left out, none.
  shift?: number;
}

export const ANSWER_SYMBOL_BOX = 36;

const DIRECTION: Record<LabelSide, ViewStyle['flexDirection']> = {
  right: 'row',
  left: 'row-reverse',
  below: 'column',
  above: 'column-reverse',
};

function partOf(testID: string | undefined, part: string): string | undefined {
  return testID === undefined ? undefined : `${testID}:${part}`;
}

function Dot({ role, number, testID }: Extract<AnswerSymbol, { type: 'dot' }> & { testID?: string }): ReactElement {
  return (
    <View style={[styles.dot, styles[role]]} testID={testID}>
      {number === null ? null : <Text style={role === 'pick' ? styles.pickNumber : styles.number}>{number}</Text>}
    </View>
  );
}

// Not named `Symbol`: that would hide the global the React Compiler's output calls, and the mark would not render.
function MarkSymbol({ symbol, testID }: { symbol: AnswerSymbol; testID?: string }): ReactElement {
  if (symbol.type === 'me') {
    return <MapPin kind="me" />;
  }
  if (symbol.type === 'face') {
    return (
      <>
        <View
          style={[styles.face, { borderStyle: symbol.dashed ? 'dashed' : 'solid' }]}
          testID={partOf(testID, 'face')}
        >
          <Text style={styles.letters}>{Array.from(symbol.name).slice(0, 2).join('')}</Text>
        </View>
        {symbol.badge === undefined ? null : (
          <View style={[styles.faceBadge, styles[symbol.badge]]} testID={partOf(testID, 'badge')}>
            <Text style={styles.number}>{symbol.badge === 'waiting' ? '?' : '✓'}</Text>
          </View>
        )}
      </>
    );
  }
  return <Dot {...symbol} testID={partOf(testID, 'dot')} />;
}

function Label({ label, testID }: { label: AnswerLabel; testID?: string }): ReactElement {
  const { side, tone, title, line, number, shift } = label;
  return (
    <View
      style={[
        styles.label,
        line !== null && styles.twoLines,
        tone === 'pick' && styles.pickLabel,
        tone === 'meeting' && styles.meetingLabel,
        shift !== undefined && (side === 'left' ? { marginRight: shift } : { marginLeft: shift }),
      ]}
      testID={partOf(testID, 'label')}
    >
      {number === null ? null : (
        <View style={[styles.badge, tone === 'pick' ? styles.pick : styles.candidate]}>
          <Text style={styles.number}>{number}</Text>
        </View>
      )}
      <View style={styles.words}>
        <Text
          numberOfLines={1}
          style={[
            tone === 'pick' ? styles.pickTitle : styles.title,
            tone === 'meeting' && styles.meetingTitle,
            tone === 'dropped' && styles.droppedTitle,
          ]}
        >
          {title}
        </Text>
        {line === null ? null : (
          <Text numberOfLines={1} style={[styles.line, tone === 'pick' && styles.pickLine]}>
            {line}
          </Text>
        )}
      </View>
    </View>
  );
}

// A mark of an answer on the map, as one picture: a symbol box of 36 by 36, which may be empty, and a label at one
// side of it. Its anchor is the centre of the symbol box, so that a label never covers its own point.
export function MapAnswerMark({
  symbol,
  label,
  testID,
}: {
  symbol: AnswerSymbol | null;
  label: AnswerLabel | null;
  testID?: string;
}): ReactElement {
  return (
    <View style={[styles.mark, { flexDirection: DIRECTION[label?.side ?? 'right'] }]} testID={testID}>
      <View style={styles.box} testID={partOf(testID, 'symbol')}>
        {symbol === null ? null : <MarkSymbol symbol={symbol} testID={testID} />}
      </View>
      {label === null ? null : <Label label={label} testID={testID} />}
    </View>
  );
}

const GAP = 2;
const LABEL_MAX = 180;
const RING = 2;
const PICK_DOT = 24;
const CANDIDATE_DOT = 20;
const SMALL_DOT = 14;
const NEXT_SQUARE = 18;
const BADGE = 16;
const FACE_BADGE = 14;

// A label's height, the tallest of its kind: one line of the pick's title with the padding and the pick's border at
// the top and at the bottom, or that title and a line under it.
const ONE_LINE = mapText.buttonTitle.lineHeight + 2 * GAP + 2 * RING;
const TWO_LINES = mapText.buttonTitle.lineHeight + mapText.rowLine.lineHeight + 2 * space[1] + 2 * RING;
// The advance widths of `assets/fonts/Pretendard-SemiBold.otf` and `Pretendard-Bold.otf` as shares of the font's
// size, rounded up: a Hangul syllable 0.864; a space, "·", and ":" at most 0.282; any other letter at most the widest
// digit's 0.66.
const HANGUL = /\p{Script=Hangul}/u;
const NARROW = /[\s·:.,]/u;
const LETTER = { hangul: 0.87, narrow: 0.29, other: 0.67 };

function wordsWidth(words: string, size: number): number {
  let width = 0;
  for (const letter of words) {
    const share = HANGUL.test(letter) ? LETTER.hangul : NARROW.test(letter) ? LETTER.narrow : LETTER.other;
    width += share * size;
  }
  return width;
}

// A label's box around its mark's point, in points, x to the right and y down, as `MapAnswerMark` lays it out: at its
// side of the symbol box, the gap and its `shift` away, and centred on the point the other way. Its width is its
// words' with the padding, the pick's border, and the number's badge, at most `LABEL_MAX`. The camera's room for
// labels and the choice of a label's side both read it.
export function answerLabelBox({ side, tone, title, line, number, shift = 0 }: AnswerLabel): {
  left: number;
  top: number;
  right: number;
  bottom: number;
} {
  const titleSize = tone === 'pick' ? mapText.buttonTitle.fontSize : mapText.rowLine.fontSize;
  const words = Math.max(wordsWidth(title, titleSize), line === null ? 0 : wordsWidth(line, mapText.rowLine.fontSize));
  const frame = 2 * space[2] + (tone === 'pick' ? 2 * RING : 0) + (number === null ? 0 : BADGE + space[1]);
  const width = Math.ceil(Math.min(LABEL_MAX, frame + words));
  const height = line === null ? ONE_LINE : TWO_LINES;
  const reach = ANSWER_SYMBOL_BOX / 2 + GAP + shift;
  if (side === 'left' || side === 'right') {
    const left = side === 'right' ? reach : -reach - width;
    return { left, top: -height / 2, right: left + width, bottom: height / 2 };
  }
  const top = side === 'below' ? reach : -reach - height;
  return { left: -width / 2, top, right: width / 2, bottom: top + height };
}

const styles = StyleSheet.create({
  mark: { alignSelf: 'flex-start', alignItems: 'center', gap: GAP },
  box: { alignItems: 'center', justifyContent: 'center', width: ANSWER_SYMBOL_BOX, height: ANSWER_SYMBOL_BOX },
  face: {
    alignItems: 'center',
    justifyContent: 'center',
    width: ANSWER_SYMBOL_BOX,
    height: ANSWER_SYMBOL_BOX,
    borderRadius: radius.full,
    borderWidth: RING,
    borderColor: color.friend,
    backgroundColor: color.friendSoft,
    boxShadow: shadow.dot,
  },
  letters: { ...mapText.smallTitle, color: color.ink },
  dot: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    borderWidth: RING,
    borderColor: color.surface,
    boxShadow: shadow.dot,
  },
  pick: { width: PICK_DOT, height: PICK_DOT, backgroundColor: color.quest },
  candidate: { width: CANDIDATE_DOT, height: CANDIDATE_DOT, backgroundColor: color.inkSubtle },
  dropped: { width: SMALL_DOT, height: SMALL_DOT, backgroundColor: color.border },
  next: { width: NEXT_SQUARE, height: NEXT_SQUARE, borderRadius: radius.sm, backgroundColor: color.snuBlue },
  faceBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    width: FACE_BADGE,
    height: FACE_BADGE,
    borderRadius: radius.full,
  },
  waiting: { backgroundColor: color.inkMuted },
  accepted: { backgroundColor: color.friend },
  pickNumber: { ...mapText.smallTitle, color: color.onPrimary },
  number: { ...text.micro, fontFamily: mapText.smallTitle.fontFamily, letterSpacing: 0, color: color.onPrimary },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    width: BADGE,
    height: BADGE,
    borderRadius: radius.full,
  },
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    maxWidth: LABEL_MAX,
    paddingVertical: GAP,
    paddingHorizontal: space[2],
    borderRadius: radius.full,
    backgroundColor: color.surface,
    boxShadow: shadow.mapName,
  },
  twoLines: { paddingVertical: space[1], borderRadius: radius.md },
  pickLabel: { borderWidth: RING, borderColor: color.quest },
  meetingLabel: { backgroundColor: color.ink },
  words: { flexShrink: 1 },
  title: { ...mapText.rowLine, color: color.ink },
  pickTitle: { ...mapText.buttonTitle, color: color.ink },
  meetingTitle: { fontFamily: mapText.smallTitle.fontFamily, color: color.onPrimary },
  droppedTitle: { color: color.inkMuted },
  line: { ...mapText.rowLine, color: color.inkMuted },
  pickLine: { color: color.quest },
});
