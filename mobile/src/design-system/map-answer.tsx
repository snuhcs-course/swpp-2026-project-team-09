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
import { ANSWER_SYMBOL_BOX, CANDIDATE_ROUND, CAPSULE, CAPSULE_EDGE, GAP, RING } from './map-answer-box';
import { MapAnswerLabel } from './map-answer-label';
import { RoundNumber } from './round-number';
import { color, mapText, radius, shadow, space, text } from './tokens';

export { ANSWER_SYMBOL_BOX, answerLabelBox, CAPSULE } from './map-answer-box';

export type AnswerSymbol =
  | { type: 'me' }
  // `dashed`: the position comes from the Timetable. `exact`: a green dot at the face's lower right, the position
  // measured at the exact level. `badge`: a "?" (`waiting`) or a "✓" (`accepted`) at the face's upper right; the
  // caller says what it means.
  | { type: 'face'; name: string; dashed: boolean; badge?: FaceBadge; exact?: boolean }
  // `faded`: drawn pale. `meal`: a meal answer's Restaurant, in coral (P04 ticket 85): the pick solid with a white
  // number, a candidate soft with a coral rim and number; left out, the pick gold and a candidate navy, as every other
  // answer's.
  | {
      type: 'dot';
      role: 'pick' | 'candidate' | 'dropped' | 'next' | 'stop' | 'kept';
      number: number | null;
      faded?: boolean;
      meal?: boolean;
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
  // A meal candidate's capsule says a clock time ("17:00"), drawn in gold as every clock time; left out, the walking
  // minutes in ink (P04 ticket 88).
  clock?: boolean;
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

// A meal answer's other candidate (P04 ticket 85): within the white ring a coral rim, a soft coral ground, and a coral
// number.
function MealCandidate({ number, testID }: { number: number | null; testID?: string }): ReactElement {
  return (
    <View style={[styles.dot, styles.candidate, styles.mealCandidate]} testID={testID}>
      <View style={styles.mealCandidateGround} testID={partOf(testID, 'ground')}>
        {number === null ? null : <RoundNumber inside={MEAL_GROUND} number={number} style={styles.mealNumber} />}
      </View>
    </View>
  );
}

// The size of a dot that may hold a number, by its role.
const PICK_DOT = 30;
const DOT_SIZES: Partial<Record<DotSymbol['role'], number>> = { pick: PICK_DOT, candidate: CANDIDATE_ROUND };
// The inside of a meal candidate's coral round: its size less its white ring and its coral rim.
const MEAL_RIM = 1.5;
const MEAL_GROUND = CANDIDATE_ROUND - 2 * RING - 2 * MEAL_RIM;

function Dot({ role, number, meal = false, testID }: DotSymbol & { testID?: string }): ReactElement {
  if (meal && role === 'candidate') {
    return <MealCandidate number={number} testID={testID} />;
  }
  const inside = (DOT_SIZES[role] ?? CANDIDATE_ROUND) - 2 * RING;
  return (
    <View style={[styles.dot, styles[role], meal && role === 'pick' && styles.mealPick]} testID={testID}>
      {number === null ? null : (
        <RoundNumber inside={inside} number={number} style={role === 'pick' ? styles.pickNumber : styles.number} />
      )}
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

// A meal candidate's minutes (P04 ticket 83): a white capsule whose near end is room for the candidate's numbered round.
// Beside its own round (`number` null) it is a picture of its own under the round, so that the two read as one capsule
// and the round's picture is the one made ahead; it runs to its side of the round. A candidate without a round of its
// own, at a spot another mark holds, carries its round inside, beside the spot, or the round alone when its minutes
// give way (no `title`).
function MinutesCapsule({ label, testID }: { label: AnswerLabel; testID?: string }): ReactElement {
  const { number, side, title, faded = false, clock = false } = label;
  const round =
    number === null ? null : <Dot meal number={number} role="candidate" testID={partOf(testID, 'dot')} type="dot" />;
  if (round !== null && title === '') {
    return <View testID={testID}>{round}</View>;
  }
  const left = side === 'left';
  return (
    <View
      style={[styles.capsule, left ? styles.capsuleLeft : styles.capsuleRight, faded && styles.faded]}
      testID={testID}
    >
      <View style={[styles.roundRoom, left ? styles.roomLeft : styles.roomRight]}>{round}</View>
      <Text numberOfLines={1} style={[styles.minutes, clock && styles.clock]} testID={partOf(testID, 'minutes')}>
        {title}
      </Text>
    </View>
  );
}

// A label at a side of the symbol box: a meal candidate's capsule holding its round, or any other label.
function SideLabel({ label, testID }: { label: AnswerLabel; testID?: string }): ReactElement {
  return label.tone === 'minutes' ? (
    <MinutesCapsule label={label} testID={testID} />
  ) : (
    <MapAnswerLabel label={label} testID={testID} />
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
  if (symbol === null && label?.tone === 'minutes' && label.number === null) {
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
      {label === null ? null : <SideLabel label={label} testID={partOf(testID, 'label')} />}
    </View>
  );
}

const CANDIDATE_DOT = CANDIDATE_ROUND;
const SMALL_DOT = 14;
const NEXT_SQUARE = 18;
const FACE_BADGE = 14;
const EXACT_DOT = 11;

const styles = StyleSheet.create({
  mark: { alignSelf: 'flex-start', alignItems: 'center', gap: GAP },
  faded: { opacity: 0.45 },
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
  mealPick: { backgroundColor: color.meal },
  // The coral rim is the round's own ground showing around its soft ground.
  mealCandidate: { backgroundColor: color.meal },
  mealCandidateGround: {
    alignItems: 'center',
    justifyContent: 'center',
    width: MEAL_GROUND,
    height: MEAL_GROUND,
    borderRadius: radius.full,
    backgroundColor: color.mealSoft,
  },
  mealNumber: { ...text.micro, fontFamily: mapText.smallTitle.fontFamily, letterSpacing: 0, color: color.meal },
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
  // The near end, under the round or holding it, and the gap before the words.
  roundRoom: { width: CAPSULE - CAPSULE_EDGE + space[1] },
  roomRight: { alignItems: 'flex-start', paddingLeft: (CAPSULE - CANDIDATE_DOT) / 2 - CAPSULE_EDGE },
  roomLeft: { alignItems: 'flex-end', paddingRight: (CAPSULE - CANDIDATE_DOT) / 2 - CAPSULE_EDGE },
  minutes: { ...mapText.smallTitle, color: color.ink },
  clock: { color: color.quest },
  number: { ...text.micro, fontFamily: mapText.smallTitle.fontFamily, letterSpacing: 0, color: color.onPrimary },
});
