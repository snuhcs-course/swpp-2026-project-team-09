/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { initials } from './avatar';
import { MapPin } from './map-pin';
import { ANSWER_SYMBOL_BOX, CAPSULE, CAPSULE_EDGE, GAP, RING } from './map-answer-box';
import { MapAnswerLabel } from './map-answer-label';
import { color, mapText, radius, shadow, space, text } from './tokens';

export { ANSWER_SYMBOL_BOX, answerLabelBox, CAPSULE } from './map-answer-box';

export type AnswerSymbol =
  | { type: 'me' }
  // `dashed`: the position comes from the Timetable. `exact`: a green dot at the face's lower right, the position
  // measured at the exact level. `badge`: a "?" (`waiting`) or a "✓" (`accepted`) at the face's upper right; the
  // caller says what it means.
  | { type: 'face'; name: string; dashed: boolean; badge?: FaceBadge; exact?: boolean }
  // `faded`: drawn pale. `ring`: how far, from 0 to 1, the ring spreading from a pick just chosen has gone, and `pop`
  // its dot a little larger as it is chosen; left out, none.
  | {
      type: 'dot';
      role: 'pick' | 'candidate' | 'dropped' | 'next' | 'stop' | 'kept';
      number: number | null;
      faded?: boolean;
      ring?: number;
      pop?: boolean;
    };

export type FaceBadge = 'waiting' | 'accepted';

export type LabelSide = 'above' | 'below' | 'left' | 'right';

// A way's flags.
type WayTone = 'leave' | 'late' | 'shuttle';

// A leg's minutes: the way there's or the way on's, whatever the mode.
export type LegTone = 'leg' | 'legOn';

export interface AnswerLabel {
  side: LabelSide;
  // `stop` is a shuttle stop's; `kept` a Quest already set's.
  // `leg` is a meal Plan's way there's minutes and `legOn` its way on's, by the shuttle too (P04 ticket 76).
  // `minutes` is a meal candidate's minutes, a capsule whose near end lies under its numbered round (P04 ticket 83).
  tone:
    'pick' | 'candidate' | 'dropped' | 'next' | 'person' | 'meeting' | 'stop' | 'kept' | 'minutes' | LegTone | WayTone;
  title: string;
  // A second line, under the title; a candidate's stands beside its title (its arrival time).
  line: string | null;
  // A candidate's line under its title and time: its dishes and price. Left out, none.
  sub?: string | null;
  // Words after the title in the pick's colour, as a meal pick's time ("11:00"), which marks a meal pick's label.
  // Left out, none.
  note?: string | null;
  // Words after the line that say what a press opens ("메뉴 ›"), in the link's colour. Left out, none.
  action?: string | null;
  // Drawn pale, as a candidate that does not fit or is far. Left out, not.
  faded?: boolean;
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

type DotSymbol = Extract<AnswerSymbol, { type: 'dot' }>;

function Dot({ role, number, ring, pop = false, testID }: DotSymbol & { testID?: string }): ReactElement {
  return (
    <>
      {ring === undefined ? null : (
        <View
          style={[styles.ring, { opacity: 1 - ring, transform: [{ scale: 1 + ring * RING_GROWTH }] }]}
          testID={partOf(testID, 'ring')}
        />
      )}
      <View style={[styles.dot, styles[role], pop && styles.pop]} testID={testID}>
        {number === null ? null : <Text style={role === 'pick' ? styles.pickNumber : styles.number}>{number}</Text>}
      </View>
    </>
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

// A meal candidate's minutes (P04 ticket 83): a white capsule whose near end is room for the candidate's numbered round,
// drawn as a picture of its own under the round, so that the two read as one capsule and the round's picture is the
// one made ahead. It runs to its side of the round.
function MinutesCapsule({ label, testID }: { label: AnswerLabel; testID?: string }): ReactElement {
  const left = label.side === 'left';
  return (
    <View
      style={[styles.capsule, left ? styles.capsuleLeft : styles.capsuleRight, label.faded === true && styles.faded]}
      testID={testID}
    >
      <View style={styles.roundRoom} />
      <Text numberOfLines={1} style={styles.minutes} testID={partOf(testID, 'minutes')}>
        {label.title}
      </Text>
    </View>
  );
}

// A mark of an answer on the map, as one picture: a symbol box of 36 by 36, which may be empty, and a label at one
// side of it. Its anchor is the centre of the symbol box, so that a label never covers its own point. A meal
// candidate's minutes are a capsule alone (`MinutesCapsule`).
export function MapAnswerMark({
  symbol,
  label,
  testID,
}: {
  symbol: AnswerSymbol | null;
  label: AnswerLabel | null;
  testID?: string;
}): ReactElement {
  if (symbol === null && label?.tone === 'minutes') {
    return <MinutesCapsule label={label} testID={testID} />;
  }
  return (
    <View
      style={[
        styles.mark,
        { flexDirection: DIRECTION[label?.side ?? 'right'] },
        (label?.faded === true || (symbol?.type === 'dot' && symbol.faded === true)) && styles.faded,
      ]}
      testID={testID}
    >
      <View style={styles.box} testID={partOf(testID, 'symbol')}>
        {symbol === null ? null : <MarkSymbol symbol={symbol} testID={testID} />}
      </View>
      {label === null ? null : <MapAnswerLabel label={label} testID={partOf(testID, 'label')} />}
    </View>
  );
}

const PICK_DOT = 30;
// How much wider than the pick's dot its ring spreads, as a share of the dot.
const RING_GROWTH = 1.4;
const CANDIDATE_DOT = 20;
const SMALL_DOT = 14;
const NEXT_SQUARE = 18;
const FACE_BADGE = 14;
const EXACT_DOT = 11;

const styles = StyleSheet.create({
  mark: { alignSelf: 'flex-start', alignItems: 'center', gap: GAP },
  faded: { opacity: 0.45 },
  ring: {
    position: 'absolute',
    width: PICK_DOT,
    height: PICK_DOT,
    borderRadius: radius.full,
    borderWidth: RING,
    borderColor: color.quest,
  },
  pop: { transform: [{ scale: 1.2 }] },
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
  kept: { width: SMALL_DOT, height: SMALL_DOT, backgroundColor: color.inkMuted },
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
  capsule: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    minHeight: CAPSULE,
    borderRadius: radius.full,
    borderWidth: CAPSULE_EDGE,
    borderColor: color.border,
    backgroundColor: color.surface,
    boxShadow: shadow.mapName,
  },
  capsuleRight: { flexDirection: 'row', paddingRight: space[2] },
  capsuleLeft: { flexDirection: 'row-reverse', paddingLeft: space[2] },
  // The near end, under the round, and the gap before the words.
  roundRoom: { width: CAPSULE - CAPSULE_EDGE + space[1] },
  minutes: { ...mapText.smallTitle, color: color.ink },
  number: { ...text.micro, fontFamily: mapText.smallTitle.fontFamily, letterSpacing: 0, color: color.onPrimary },
});
