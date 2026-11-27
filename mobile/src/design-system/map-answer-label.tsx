/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text, type TextStyle, useWindowDimensions, View, type ViewStyle } from 'react-native';
import type { AnswerLabel } from './map-answer';
import { BADGE, GAP, LABEL_MAX, pickTimeMax, RING, SUB_MAX } from './map-answer-box';
import { RoundNumber } from './round-number';
import { color, mapText, radius, shadow, space, text } from './tokens';

const WAY_FLAGS = new Set<AnswerLabel['tone']>(['leave', 'late', 'shuttle']);
// A meal candidate's number badge: its coral rim (P04 ticket 90).
const MEAL_BADGE_RIM = 1.5;

// A label's title and its line: a candidate's side by side, with its dishes under them (`sub`).
function LabelWords({ tone, title, line, sub = null, note = null, action = null }: AnswerLabel): ReactElement {
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
          tone === 'kept' && styles.keptTitle,
          WAY_FLAGS.has(tone) && styles.flagTitle,
          tone === 'late' && styles.lateTitle,
          tone === 'shuttle' && styles.shuttleTitle,
          LEG_TITLES[tone],
        ]}
      >
        {title}
        {note === null ? null : <Text style={styles.note}>{` ${note}`}</Text>}
      </Text>
      {line === null ? null : (
        <Text
          numberOfLines={1}
          style={[styles.line, tone === 'pick' && note === null && styles.pickLine, tone === 'stop' && styles.stopLine]}
        >
          {line}
          {action === null ? null : <Text style={styles.action}>{` ${action}`}</Text>}
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

// The label of an answer's mark (`MapAnswerMark`): its words in a tag beside the symbol box.
export function MapAnswerLabel({ label, testID }: { label: AnswerLabel; testID?: string }): ReactElement {
  const { side, tone, line, number, shift, sub = null, note = null, meal = false } = label;
  const { fontScale } = useWindowDimensions();
  return (
    <View
      style={[
        styles.label,
        ((line !== null && tone !== 'candidate') || sub !== null) && styles.twoLines,
        tone === 'pick' && styles.pickLabel,
        tone === 'candidate' && styles.candidateLabel,
        tone === 'kept' && styles.keptLabel,
        (sub !== null || tone === 'pick') && styles.subLabel,
        tone === 'pick' && note !== null && [styles.mealPickLabel, { maxWidth: pickTimeMax(fontScale) }],
        meal && (tone === 'pick' || tone === 'candidate') && styles.mealEdge,
        label.study === true && tone === 'pick' && styles.studyEdge,
        tone === 'meeting' && styles.meetingLabel,
        tone === 'late' && styles.lateLabel,
        tone === 'shuttle' && styles.shuttleLabel,
        LEG_LABELS[tone],
        shift !== undefined && (side === 'left' ? { marginRight: shift } : { marginLeft: shift }),
      ]}
      testID={testID}
    >
      {number === null ? null : (
        <View style={[styles.badge, tone === 'pick' ? pickBadgeOf(note, meal) : candidateBadgeOf(meal)]}>
          <RoundNumber
            inside={meal && tone !== 'pick' ? BADGE - 2 * MEAL_BADGE_RIM : BADGE}
            number={number}
            style={[styles.number, meal && tone !== 'pick' && styles.mealNumber]}
          />
        </View>
      )}
      <LabelWords {...label} />
    </View>
  );
}

const styles = StyleSheet.create({
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
  // A Quest already set (P04 ticket 20): grey, apart from the candidates, with no number.
  keptLabel: { borderWidth: 1.5, borderColor: color.inkMuted },
  keptTitle: { fontFamily: mapText.smallTitle.fontFamily, color: color.inkMuted },
  sub: { ...mapText.rowLine, color: color.inkMuted },
  subLabel: { maxWidth: SUB_MAX },
  // A meal pick's label (its time, `note`, marks it): coral since P04 ticket 85, its time still gold.
  mealPickLabel: { borderColor: color.meal },
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
  note: { color: color.quest },
  line: { ...mapText.rowLine, color: color.inkMuted },
  pickLine: { color: color.quest },
  stopLine: { color: color.svcShuttle },
  pickBadge: { backgroundColor: color.quest },
  mealPickBadge: { backgroundColor: color.meal },
  // A meal answer's candidate's name tag (P04 ticket 90): its number as the candidate's soft coral round.
  mealEdge: { borderColor: color.meal },
  // A 관정 booking's pick (P01 ticket 10): the study colour's edge.
  studyEdge: { borderColor: color.svcStudy },
  mealCandidateBadge: { borderWidth: MEAL_BADGE_RIM, borderColor: color.meal, backgroundColor: color.mealSoft },
  mealNumber: { color: color.meal },
  candidateBadge: { backgroundColor: color.snuBlue },
  number: { ...text.micro, fontFamily: mapText.smallTitle.fontFamily, letterSpacing: 0, color: color.onPrimary },
  action: { fontFamily: mapText.smallTitle.fontFamily, color: color.snuBlue },
  // A meal Plan's leg's minutes (P04 ticket 76), the whole leg's time: the way there dark with white words and the way
  // on pale with dark words, by the shuttle too. The shuttle's purple stays on its ride and its stops, so that a pill
  // does not read as the ride's minutes alone.
  legLabel: { paddingHorizontal: space[1], backgroundColor: color.snuBlue },
  legOnLabel: { paddingHorizontal: space[1], backgroundColor: color.blue100 },
  legTitle: { fontFamily: mapText.smallTitle.fontFamily, color: color.onPrimary },
  legOnTitle: { fontFamily: mapText.smallTitle.fontFamily, color: color.snuBlue },
});

// A pick's number badge, when its dot is not drawn: a meal pick's coral (P04 ticket 85), any other gold.
function pickBadgeOf(note: string | null, meal: boolean): ViewStyle {
  return note === null && !meal ? styles.pickBadge : styles.mealPickBadge;
}

// A candidate's number badge: a meal's soft coral (P04 ticket 90), any other navy.
function candidateBadgeOf(meal: boolean): ViewStyle {
  return meal ? styles.mealCandidateBadge : styles.candidateBadge;
}

const LEG_LABELS: Partial<Record<AnswerLabel['tone'], ViewStyle>> = {
  leg: styles.legLabel,
  legOn: styles.legOnLabel,
};

const LEG_TITLES: Partial<Record<AnswerLabel['tone'], TextStyle>> = {
  leg: styles.legTitle,
  legOn: styles.legOnTitle,
};
