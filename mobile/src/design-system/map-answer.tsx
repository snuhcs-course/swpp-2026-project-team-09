/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { MapPin } from './map-pin';
import { color, mapText, radius, shadow, space, text } from './tokens';

export type AnswerSymbol =
  | { type: 'me' }
  // `dashed`: the position comes from the Timetable.
  | { type: 'face'; name: string; dashed: boolean }
  | { type: 'dot'; role: 'pick' | 'candidate' | 'dropped' | 'next'; number: number | null };

export type LabelSide = 'above' | 'below' | 'left' | 'right';

export interface AnswerLabel {
  side: LabelSide;
  tone: 'pick' | 'candidate' | 'dropped' | 'next' | 'person' | 'meeting';
  title: string;
  // A second line, under the title.
  line: string | null;
  // A number badge before the title, when the mark's own dot is not drawn.
  number: number | null;
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
      <View style={[styles.face, { borderStyle: symbol.dashed ? 'dashed' : 'solid' }]} testID={partOf(testID, 'face')}>
        <Text style={styles.letters}>{Array.from(symbol.name).slice(0, 2).join('')}</Text>
      </View>
    );
  }
  return <Dot {...symbol} testID={partOf(testID, 'dot')} />;
}

function Label({ label, testID }: { label: AnswerLabel; testID?: string }): ReactElement {
  const { tone, title, line, number } = label;
  return (
    <View
      style={[
        styles.label,
        line !== null && styles.twoLines,
        tone === 'pick' && styles.pickLabel,
        tone === 'meeting' && styles.meetingLabel,
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
