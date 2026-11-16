/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text } from 'react-native';
import { color, text } from '@/design-system';
import { thisVersionLine } from './version-line';

// The build and update the phone runs, at the bottom of 내 정보.
export function BuildLine(): ReactElement {
  return <Text style={styles.version}>{thisVersionLine()}</Text>;
}

const styles = StyleSheet.create({
  version: { ...text.caption, textAlign: 'center', color: color.inkMuted },
});
