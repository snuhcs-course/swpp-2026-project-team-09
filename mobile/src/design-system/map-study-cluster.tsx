/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color, font, halo, radius, shadow, text } from './tokens';

// Study pins merged while the whole campus is in view, as the `Main` frame draws a cluster of 공부공간: a rounded
// square in the study colour with the count in white, inside a translucent square of its own.
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

const CLUSTER = 44;
const CLUSTER_INNER = 30;
// The white border of a pin's head.
const BORDER = 2;

const styles = StyleSheet.create({
  cluster: {
    alignItems: 'center',
    justifyContent: 'center',
    width: CLUSTER,
    height: CLUSTER,
    borderRadius: radius.lg,
    backgroundColor: halo.study,
  },
  selectedCluster: { boxShadow: `0 0 0 4px ${halo.selected}` },
  clusterInner: {
    alignItems: 'center',
    justifyContent: 'center',
    width: CLUSTER_INNER,
    height: CLUSTER_INNER,
    borderRadius: radius.md,
    borderWidth: BORDER,
    borderColor: color.surface,
    backgroundColor: color.svcStudy,
    boxShadow: shadow.float,
  },
  clusterCount: { ...text.micro, fontFamily: font.bold, lineHeight: 14, color: color.onPrimary },
});
