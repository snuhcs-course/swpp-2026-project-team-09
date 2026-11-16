/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text } from 'react-native';
import { color, text } from '@/design-system';

// One short muted line of an answer's or a Lookup's card, above its buttons, or nothing.
export function CardNote({ note }: { note: string | undefined }): ReactElement | null {
  return note === undefined ? null : <Text style={styles.note}>{note}</Text>;
}

const styles = StyleSheet.create({
  note: { ...text.body, color: color.inkMuted },
});
