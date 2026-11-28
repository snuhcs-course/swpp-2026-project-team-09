/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text } from 'react-native';
import { color, font } from '@/design-system';
import type { Missing } from '@/features/party/making';

// How the 파티 form marks a required field left empty once its button was pressed: a red outline and a red line.

export const MARK_WORDS: Record<Missing, string> = {
  title: '제목을 입력해 주세요',
  description: '본문을 입력해 주세요',
  board: '게시판을 골라 주세요',
  friends: '초대할 친구를 골라 주세요',
};

// The red line of a marked field.
export function MarkLine({ missing }: { missing: Missing }): ReactElement {
  return <Text style={styles.line}>{MARK_WORDS[missing]}</Text>;
}

// The asterisk after a required field's name or placeholder.
export function Required(): ReactElement {
  return <Text style={styles.required}> *</Text>;
}

// The outline sits outside the words it frames, so that they stay in line with the rest of the page, and is there
// unmarked too, in no colour, so that a mark moves nothing.
const OUTSIDE = 8;
const BORDER = 1.5;

export const markStyles = StyleSheet.create({
  frame: {
    marginHorizontal: -OUTSIDE,
    paddingHorizontal: OUTSIDE - BORDER,
    borderWidth: BORDER,
    borderColor: 'transparent',
    borderRadius: 12,
  },
  marked: { borderColor: color.danger },
});

const styles = StyleSheet.create({
  line: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: color.danger },
  required: { color: color.danger },
});
