/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { seeThrough } from './see-through';
import { color, font, halo, radius, text } from './tokens';

// Study pins merged while the whole campus is in view, as the changelog of 11.24 (§ 4-6) and the `Main` board draw a
// cluster of 공부공간: a light sky round, see-through, with the count in white in a round of the study pins' sky.
export function MapStudyCluster({ count, selected = false }: { count: number; selected?: boolean }): ReactElement {
  return (
    <View
      accessibilityLabel={`공부공간 ${count}곳 묶음`}
      accessibilityRole="image"
      accessibilityState={{ selected }}
      accessible
      style={[styles.cluster, selected && styles.selectedCluster]}
    >
      <View style={styles.clusterInner}>
        <Text style={styles.clusterCount}>{count}</Text>
      </View>
    </View>
  );
}

const CLUSTER = 46;
const CLUSTER_INNER = 30;
const RIM = `0 0 0 1.5px ${halo.studyRim}`;

const styles = StyleSheet.create({
  cluster: {
    alignItems: 'center',
    justifyContent: 'center',
    width: CLUSTER,
    height: CLUSTER,
    borderRadius: radius.full,
    backgroundColor: halo.study,
    boxShadow: RIM,
  },
  selectedCluster: { boxShadow: `${RIM}, 0 0 0 4px ${halo.selected}` },
  clusterInner: {
    alignItems: 'center',
    justifyContent: 'center',
    width: CLUSTER_INNER,
    height: CLUSTER_INNER,
    borderRadius: radius.full,
    backgroundColor: seeThrough(color.pinStudy, 0.92),
    boxShadow: `0 0 0 2px ${color.surface}`,
  },
  clusterCount: { ...text.micro, fontFamily: font.bold, fontSize: 13, lineHeight: 16, color: color.onPrimary },
});
