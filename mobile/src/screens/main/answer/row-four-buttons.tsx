/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Plan, PlanInput } from '@/api/assistant-types';
import { Button, ChoiceGrid, color, type GridChoice, space, text } from '@/design-system';
import { newPartyOf, partiesOf } from '@/features/assistant/row-four-inputs';
import type { PlanInvitation } from '@/features/assistant/use-plan-invitation';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import { joinLabel, openPost } from '../../party/post-card';
import { type RowFourActions, useRowFourActions } from './row-four-actions';

interface RowFourButtonsProps {
  shown: ShownAnswer;
  invitation: PlanInvitation;
  busy: boolean;
}

interface Pressed {
  label: string;
  onPress: () => void;
}

// "새로 모집": a recalculation for an event, or words to the Assistant, which knows the activity a search was for.
function recruit(input: PlanInput, plan: Plan, { change }: ShownAnswer, { ask }: RowFourActions): Pressed {
  const party = newPartyOf(input, plan);
  return {
    label: '새로 모집',
    onPress: () => {
      if (party === null) {
        ask('새로 모집');
      } else {
        change(() => party);
      }
    },
  };
}

// An events Plan's "같이 갈 파티", "새로 모집", and "길 안내"; a party's Plan's "참여하기" or "참여 신청", which opens its
// post, and "새로 모집". The first is the main one.
function pressesOf(input: PlanInput, plan: Plan, shown: ShownAnswer, actions: RowFourActions): Pressed[] {
  if (input.kind === 'events') {
    const parties = partiesOf(plan);
    return [
      {
        label: '같이 갈 파티',
        onPress: () => {
          shown.change(() => parties);
        },
      },
      recruit(input, plan, shown, actions),
      {
        label: '길 안내',
        onPress: () => {
          actions.guide(plan.place);
        },
      },
    ];
  }
  const { quest } = plan;
  const join: Pressed[] =
    quest === undefined
      ? []
      : [
          {
            label: joinLabel(quest),
            onPress: () => {
              openPost(quest.id);
            },
          },
        ];
  return [...join, recruit(input, plan, shown, actions)];
}

// The Friends free then who are not in a new party, each with the line of their day; a press adds one.
function candidateCells(plan: Plan, pending: string | null): GridChoice[] {
  return (plan.candidates ?? []).map(({ userId, name, line }) => {
    const named = `${name} · `;
    const day = line.startsWith(named) ? line.slice(named.length) : line;
    const busy = userId === pending;
    const value = busy ? '넣는 중' : '';
    return {
      key: userId,
      name,
      sub: day,
      value,
      faint: false,
      label: `${name}, ${day}, ${busy ? value : '추가'}`,
      busy,
    };
  });
}

function NewParty({ shown, invitation, busy, plan }: RowFourButtonsProps & { plan: Plan }): ReactElement {
  const cells = candidateCells(plan, shown.pendingAdd);
  return (
    <>
      {cells.length === 0 ? null : (
        <View style={styles.candidates} testID="party-candidates">
          <Text style={styles.caption}>그때 비어 있는 친구</Text>
          <ChoiceGrid choices={cells} disabled={busy} onChoose={shown.add} />
        </View>
      )}
      <Button disabled={busy} full onPress={invitation.invite}>
        {invitation.sending ? '올리는 중이에요' : '이대로 모집'}
      </Button>
    </>
  );
}

// The buttons of an events Plan, a party's Plan, and a new party's Plan, in a row of cells of one width, events and
// parties after what was dropped with its reason in faint ink, since their scene draws none of it; a new party's Plan
// has its Friends who could come and "이대로 모집", which posts it as "이대로 초대" makes a meal's Quest. Nothing for a
// meal's or a meet's Plan.
export function RowFourButtons(props: RowFourButtonsProps): ReactElement | null {
  const actions = useRowFourActions();
  const { answer, plan } = props.shown;
  if (answer === null || plan === null) {
    return null;
  }
  const { input } = answer;
  if (input.kind === 'new-quest') {
    return <NewParty {...props} plan={plan} />;
  }
  if (input.kind !== 'events' && input.kind !== 'quests') {
    return null;
  }
  return (
    <>
      {answer.dropped.map(({ reason }) => (
        <Text key={reason} style={styles.caption}>
          {reason}
        </Text>
      ))}
      <View style={styles.row} testID="row-four-buttons">
        {pressesOf(input, plan, props.shown, actions).map(({ label, onPress }, index) => (
          <View key={label} style={styles.cell}>
            <Button disabled={props.busy} full onPress={onPress} variant={index === 0 ? 'primary' : 'secondary'}>
              {label}
            </Button>
          </View>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space[2] },
  cell: { flex: 1 },
  candidates: { gap: space[2] },
  caption: { ...text.caption, color: color.inkMuted },
});
