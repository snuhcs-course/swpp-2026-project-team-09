/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { initials } from './avatar';
import { MapPin } from './map-pin';
import { ANSWER_SYMBOL_BOX, BADGE, GAP, LABEL_MAX, RING, SUB_MAX } from './map-answer-box';
import { color, mapText, radius, shadow, space, text } from './tokens';

export { ANSWER_SYMBOL_BOX, answerLabelBox } from './map-answer-box';

export type AnswerSymbol =
  | { type: 'me' }
  // `dashed`: the position comes from the Timetable. `exact`: a green dot at the face's lower right, the position
  // measured at the exact level. `badge`: a "?" (`waiting`) or a "✓" (`accepted`) at the face's upper right; the
  // caller says what it means.
  | { type: 'face'; name: string; dashed: boolean; badge?: FaceBadge; exact?: boolean }
  | { type: 'dot'; role: 'pick' | 'candidate' | 'dropped' | 'next' | 'stop'; number: number | null };

export type FaceBadge = 'waiting' | 'accepted';

export type LabelSide = 'above' | 'below' | 'left' | 'right';

export interface AnswerLabel {
  side: LabelSide;
  // `stop` is a shuttle stop's; `leave`, `late`, and `shuttle` are a way's flags.
  tone: 'pick' | 'candidate' | 'dropped' | 'next' | 'person' | 'meeting' | 'stop' | 'leave' | 'late' | 'shuttle';
  title: string;
  // A second line, under the title; a candidate's stands beside its title (its arrival time).
  line: string | null;
  // A candidate's line under its title and time: its dishes and price. Left out, none.
  sub?: string | null;
  // A number badge before the title, when the mark's own dot is not drawn.
  number: number | null;
  // How much further than the gap a label at the left or the right stands from the symbol box, in points, so that it
  // shares an edge with the labels of neighbouring marks. Left out, none.
  shift?: number;
}

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
          <Text style={styles.letters}>{initials(symbol.name)}</Text>
        </View>
        {symbol.exact === true ? <View style={styles.exact} testID={partOf(testID, 'exact')} /> : null}
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

// A label's title and its line: a candidate's side by side, with its dishes under them (`sub`).
function LabelWords({ tone, title, line, sub = null }: AnswerLabel): ReactElement {
  const candidate = tone === 'candidate';
  const head = (
    <>
      <Text
        numberOfLines={1}
        style={[
          tone === 'pick' ? styles.pickTitle : styles.title,
          candidate && styles.candidateTitle,
          tone === 'meeting' && styles.meetingTitle,
          tone === 'dropped' && styles.droppedTitle,
          WAY_FLAGS.has(tone) && styles.flagTitle,
          tone === 'late' && styles.lateTitle,
          tone === 'shuttle' && styles.shuttleTitle,
        ]}
      >
        {title}
      </Text>
      {line === null ? null : (
        <Text
          numberOfLines={1}
          style={[styles.line, tone === 'pick' && styles.pickLine, tone === 'stop' && styles.stopLine]}
        >
          {line}
        </Text>
      )}
    </>
  );
  if (!candidate) {
    return <View style={styles.words}>{head}</View>;
  }
  return (
    <View style={styles.words}>
      <View style={styles.inline}>{head}</View>
      {sub === null ? null : (
        <Text numberOfLines={1} style={styles.sub}>
          {sub}
        </Text>
      )}
    </View>
  );
}

function Label({ label, testID }: { label: AnswerLabel; testID?: string }): ReactElement {
  const { side, tone, line, number, shift, sub = null } = label;
  return (
    <View
      style={[
        styles.label,
        ((line !== null && tone !== 'candidate') || sub !== null) && styles.twoLines,
        tone === 'pick' && styles.pickLabel,
        tone === 'candidate' && styles.candidateLabel,
        (sub !== null || tone === 'pick') && styles.subLabel,
        tone === 'meeting' && styles.meetingLabel,
        tone === 'late' && styles.lateLabel,
        tone === 'shuttle' && styles.shuttleLabel,
        shift !== undefined && (side === 'left' ? { marginRight: shift } : { marginLeft: shift }),
      ]}
      testID={partOf(testID, 'label')}
    >
      {number === null ? null : (
        <View style={[styles.badge, tone === 'pick' ? styles.pick : styles.candidate]}>
          <Text style={styles.number}>{number}</Text>
        </View>
      )}
      <LabelWords {...label} />
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

const PICK_DOT = 24;
const CANDIDATE_DOT = 20;
const SMALL_DOT = 14;
const NEXT_SQUARE = 18;
const FACE_BADGE = 14;
const EXACT_DOT = 11;
const WAY_FLAGS = new Set<AnswerLabel['tone']>(['leave', 'late', 'shuttle']);

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
  candidate: { width: CANDIDATE_DOT, height: CANDIDATE_DOT, backgroundColor: color.snuBlue },
  dropped: { width: SMALL_DOT, height: SMALL_DOT, backgroundColor: color.border },
  next: { width: NEXT_SQUARE, height: NEXT_SQUARE, borderRadius: radius.sm, backgroundColor: color.snuBlue },
  stop: { width: SMALL_DOT, height: SMALL_DOT, backgroundColor: color.svcShuttle },
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
  exact: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: EXACT_DOT,
    height: EXACT_DOT,
    borderRadius: radius.full,
    borderWidth: RING,
    borderColor: color.surface,
    backgroundColor: color.live,
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
  // Another candidate (boards 20 and 21): its number, its name, and its time on one line, in a tag that reads as one
  // to press.
  candidateLabel: { borderWidth: 1.5, borderColor: color.snuBlue },
  inline: { flexDirection: 'row', alignItems: 'baseline', gap: space[1] },
  candidateTitle: { fontFamily: mapText.smallTitle.fontFamily },
  sub: { ...mapText.rowLine, color: color.inkMuted },
  subLabel: { maxWidth: SUB_MAX },
  meetingLabel: { backgroundColor: color.ink },
  lateLabel: { backgroundColor: color.dangerSoft },
  shuttleLabel: { backgroundColor: color.svcShuttleSoft },
  words: { flexShrink: 1 },
  title: { ...mapText.rowLine, color: color.ink },
  pickTitle: { ...mapText.buttonTitle, color: color.ink },
  meetingTitle: { fontFamily: mapText.smallTitle.fontFamily, color: color.onPrimary },
  droppedTitle: { color: color.inkMuted },
  flagTitle: { fontFamily: mapText.smallTitle.fontFamily, color: color.ink },
  lateTitle: { color: color.danger },
  shuttleTitle: { color: color.svcShuttle },
  line: { ...mapText.rowLine, color: color.inkMuted },
  pickLine: { color: color.quest },
  stopLine: { color: color.svcShuttle },
});
