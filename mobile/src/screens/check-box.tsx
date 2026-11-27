/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { color, Icon, radius } from '@/design-system';

const SIZE = 20;

// The box of a checkbox, as the room book card's "서약서 동의" first drew it: outlined, and SNU blue with a check once
// ticked. The press, the label and the role belong to the row around it.
export function CheckBox({ checked }: { checked: boolean }): ReactElement {
  return (
    <View style={[styles.box, checked && styles.checked]}>
      {checked ? <Icon color={color.onPrimary} name="check" size={14} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
    width: SIZE,
    height: SIZE,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: color.borderStrong,
    backgroundColor: color.surface,
  },
  checked: { borderColor: color.snuBlue, backgroundColor: color.snuBlue },
});
