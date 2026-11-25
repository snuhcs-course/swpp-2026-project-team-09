/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon } from './icon';
import { seeThrough } from './see-through';
import { color, questTone, radius, shadow, size } from './tokens';

const TONES = {
  class: { icon: 'clock', name: '강의' },
  open: { icon: 'users', name: '공개' },
  closed: { icon: 'lock', name: '비공개' },
} as const;

export type QuestRoundTone = keyof typeof TONES;

// The round of a row of the Quest list, as the changelog of 11.24 (§ 4-1) draws it: every Party in the key colour,
// told apart by its icon, a person for 공개 and a lock for 비공개, which a screen reader names; a class in the muted
// ink with a clock. On the map it is 28 and see-through, at 70% inside a light white ring; on the whole screen it is
// the row's solid round of 40.
export function QuestRound({ tone, onMap = false }: { tone: QuestRoundTone; onMap?: boolean }): ReactElement {
  const { icon, name } = TONES[tone];
  const { round } = questTone[tone];
  return (
    <View
      style={[onMap ? styles.onMap : styles.inList, { backgroundColor: onMap ? seeThrough(round, ON_MAP) : round }]}
    >
      <Icon color={color.onPrimary} label={name} name={icon} size={onMap ? 16 : 18} />
    </View>
  );
}

const ON_MAP = 0.7;
const ROUND_ON_MAP = 28;

const styles = StyleSheet.create({
  inList: {
    alignItems: 'center',
    justifyContent: 'center',
    width: size.avatar,
    height: size.avatar,
    borderRadius: radius.full,
  },
  onMap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: ROUND_ON_MAP,
    height: ROUND_ON_MAP,
    borderRadius: radius.full,
    boxShadow: shadow.mapQuestMark,
  },
});
