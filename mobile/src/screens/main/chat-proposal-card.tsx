/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { QuestProposal } from '@/api/assistant-types';
import { Button, cardStyles, color, font, Icon, type IconName, space, text } from '@/design-system';
import { boardName } from '@/features/party/boards';
import { type PartyForm, proposalForm } from '@/features/party/making';
import { whenOf } from '@/features/party/posts';

// Where a Proposal's making stands: not yet, on its way, or done, after which the card makes nothing more.
export type ProposalMaking = 'ready' | 'making' | 'made';

interface ChatProposalCardProps {
  proposal: QuestProposal;
  making: ProposalMaking;
  // 만들기: makes the Quest as the party form does.
  onMake: () => void;
  // 수정: opens the party form filled with it.
  onEdit: () => void;
}

const EMPTY = '없음';

interface Row {
  icon: IconName;
  label: string;
  value: string;
}

// Where it meets: the Proposal's Place by name, else the event's place the form takes.
function whereOf({ place }: QuestProposal, form: PartyForm): string {
  if (place !== null) {
    return place.name;
  }
  return form.place !== undefined && 'label' in form.place ? form.place.label : EMPTY;
}

// The party form's fields, as the form the Proposal fills holds them, empty where it gives none. A 비공개 파티 has no
// Board, so no 게시판 row; the photo and the tags are not shown.
function rowsOf(proposal: QuestProposal, form: PartyForm): Row[] {
  const policy = form.policy === 'open' ? '바로 참여' : '승인 후 참여';
  const shared = form.visibility === 'public';
  const invitees = proposal.invitees.map(({ name }) => name).join(', ');
  const board: Row[] = shared
    ? [{ icon: 'layers', label: '게시판', value: form.board === null ? EMPTY : boardName(form.board) }]
    : [];
  return [
    { icon: 'edit', label: '제목', value: form.title },
    { icon: 'lock', label: '공개 범위', value: shared ? `공개 · ${policy}` : '비공개' },
    ...board,
    { icon: 'clock', label: '언제', value: form.startsAt === null ? EMPTY : whenOf(form.startsAt) },
    { icon: 'pin', label: '어디서', value: whereOf(proposal, form) },
    { icon: 'calendar', label: '관련 행사', value: form.event?.title ?? EMPTY },
    { icon: 'user', label: '친구 초대', value: invitees === '' ? EMPTY : invitees },
    { icon: 'users', label: '인원', value: `${String(form.capacity)}명` },
  ];
}

const MAKE_WORDS: Record<ProposalMaking, string> = { ready: '만들기', making: '만드는 중', made: '만들었어요' };

// The Proposal of an answer: the 파티 the Assistant filled in, as rows of the form's fields and its recruiting text
// under them, which the Assistant may have written, with 수정 and 만들기. Nothing is made until 만들기 is pressed, or
// until the form 수정 opens is sent. Once on its way or made, neither does anything more.
export function ChatProposalCard({ proposal, making, onMake, onEdit }: ChatProposalCardProps): ReactElement {
  const form = proposalForm(proposal);
  return (
    <View style={[cardStyles.card, styles.card]} testID="proposal-card">
      <Text accessibilityRole="header" style={styles.kicker}>
        새 파티
      </Text>
      <View>
        {rowsOf(proposal, form).map(({ icon, label, value }) => (
          <View accessibilityLabel={`${label} ${value}`} accessible key={label} style={styles.row}>
            <Icon color={color.inkMuted} name={icon} size={16} />
            <Text style={styles.label}>{label}</Text>
            <Text style={[styles.value, value === EMPTY && styles.empty]}>{value}</Text>
          </View>
        ))}
      </View>
      {form.description === '' ? null : <Text style={styles.description}>{form.description}</Text>}
      <View style={styles.buttons}>
        <View style={styles.button}>
          <Button disabled={making !== 'ready'} full onPress={onEdit} variant="secondary">
            수정
          </Button>
        </View>
        <View style={styles.button}>
          <Button disabled={making !== 'ready'} full onPress={onMake} variant="primary">
            {MAKE_WORDS[making]}
          </Button>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: space[1], marginTop: space[2] },
  kicker: { ...text.caption, fontFamily: font.semiBold, color: color.party },
  description: { ...text.body, marginTop: space[2], color: color.ink },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    minHeight: 36,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  label: { ...text.body, width: 72, color: color.inkMuted },
  value: { ...text.body, flex: 1, textAlign: 'right', color: color.ink },
  empty: { color: color.inkMuted },
  buttons: { flexDirection: 'row', gap: space[2], marginTop: space[3] },
  button: { flex: 1 },
});
