/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color, Glass, radius, space, text } from '@/design-system';
import { Section } from './layout';

// Stripes in the map's colours, so that what shows through each level can be seen.
const STRIPES = [color.snuBlue, color.surface, color.party, color.friend, color.surface, color.quest, color.svcStudy];

// Each level as it is used: the panel holds the inner box and the field, and the two chips stand on the ground itself.
export function GlassLayer(): ReactElement {
  return (
    <Section name="Glass">
      <View style={styles.ground}>
        <View style={styles.stripes}>
          {STRIPES.map((stripe, at) => (
            <View key={at} style={[styles.stripe, { backgroundColor: stripe }]} />
          ))}
        </View>
        <Glass level="panel" style={styles.panel}>
          <Text style={styles.words}>panel · 학생회관식당까지 걸어서 6분</Text>
          <Glass level="inner" style={styles.inner}>
            <Text style={styles.words}>inner · 오늘의 메뉴 4,000원</Text>
          </Glass>
          <Glass level="field" style={styles.field}>
            <Text style={styles.hint}>field · 이어서 말하기</Text>
          </Glass>
        </Glass>
        <View style={styles.chips}>
          <Glass level="mapChip" style={[styles.chip, styles.rimmed]}>
            <Text style={styles.chipWords}>mapChip · 6분</Text>
          </Glass>
          <Glass level="darkChip" style={styles.chip}>
            <Text style={styles.darkWords}>darkChip · 10:45 301동</Text>
          </Glass>
        </View>
      </View>
    </Section>
  );
}

const styles = StyleSheet.create({
  ground: { gap: space[4], padding: space[4], borderRadius: radius.lg, overflow: 'hidden' },
  stripes: { ...StyleSheet.absoluteFill, flexDirection: 'row', transform: [{ skewX: '-20deg' }, { scale: 1.4 }] },
  stripe: { flex: 1 },
  panel: { gap: space[3], padding: space[4], borderRadius: radius.xl },
  inner: { padding: space[3], borderRadius: radius.md },
  field: { padding: space[3], borderRadius: radius.full },
  words: { ...text.label, color: color.ink },
  hint: { ...text.body, color: color.inkMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3] },
  chip: { paddingHorizontal: space[3], paddingVertical: space[1], borderRadius: radius.full },
  rimmed: { borderWidth: 1 },
  chipWords: { ...text.caption, color: color.ink },
  darkWords: { ...text.caption, color: color.onPrimary },
});
