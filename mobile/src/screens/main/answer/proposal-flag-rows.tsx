/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { QuestProposal } from '@/api/assistant-types';
import { color, font, space, text } from '@/design-system';
import { boardName } from '@/features/party/boards';

interface ProposalFlagRowsProps {
  proposal: QuestProposal;
  // Whether the form may still open: not once the Proposal is on its way or made.
  editable: boolean;
  // Opens the party form filled with the Proposal, as the card's 수정 does.
  onEdit: () => void;
}

function rowsOf({ title, joinPolicy, board, capacity, invitees }: QuestProposal): { name: string; value: string }[] {
  const shared = joinPolicy !== 'closed';
  const visibility = shared ? `공개 · ${joinPolicy === 'open' ? '바로 참여' : '승인 후 참여'}` : '비공개';
  const names = invitees.map(({ name }) => name);
  return [
    { name: '제목', value: title },
    { name: '공개 범위', value: visibility },
    ...(shared && board !== null ? [{ name: '게시판', value: boardName(board) }] : []),
    { name: '정원', value: `${String(capacity)}명` },
    ...(names.length > 0 ? [{ name: '초대', value: `${names.join(', ')} ${String(names.length)}명` }] : []),
  ];
}

// The card of a Proposal's flag (board 11): the 파티 it makes, as rows of its title, who sees it, its Board when it is
// 공개, its size, and who is invited. Each row opens the party form filled with it, where every field is changed.
export function ProposalFlagRows({ proposal, editable, onEdit }: ProposalFlagRowsProps): ReactElement {
  return (
    <View style={styles.rows} testID="proposal-flag-rows">
      <Text accessibilityRole="header" style={styles.head}>
        파티
      </Text>
      {rowsOf(proposal).map(({ name, value }) => (
        <Pressable
          accessibilityLabel={`${name} ${value}`}
          accessibilityRole="button"
          accessibilityState={{ disabled: !editable }}
          disabled={!editable}
          key={name}
          onPress={onEdit}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <Text style={styles.name}>{name}</Text>
          <Text numberOfLines={2} style={styles.value}>
            {editable ? `${value} ›` : value}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  rows: { gap: space[2] },
  head: { ...text.label, fontFamily: font.semiBold, color: color.ink },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space[3], minHeight: 28 },
  name: { ...text.label, color: color.inkMuted },
  value: { ...text.label, flexShrink: 1, color: color.ink, textAlign: 'right' },
  pressed: { opacity: 0.6 },
});
