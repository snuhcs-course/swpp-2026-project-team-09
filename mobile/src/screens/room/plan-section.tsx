import { type ReactElement, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { newIdempotencyKey } from '@/api/idempotency-key';
import type { SubQuest } from '@/api/types';
import { color, Dialog, font, Icon, type IconName, radius, space } from '@/design-system';
import type { PlanStepView, RoomView } from '@/features/quests/room-adapter';
import { PlanForm } from './plan-form';
import type { RoomActions } from './use-room-actions';

interface PlanSectionProps {
  room: RoomView;
  actions: RoomActions;
}

// The form that is open: a new Sub Quest with the key kept for the retries of that one add, or the one edited.
type Editing = { kind: 'add'; key: string } | { kind: 'edit'; subQuest: SubQuest } | null;

interface StepProps {
  step: PlanStepView;
  last: boolean;
  editsPlan: boolean;
  onDone: () => void;
  onEdit: () => void;
  onCancel: () => void;
}

function SmallButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }): ReactElement {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={space[2]}
      onPress={onPress}
      style={styles.small}
    >
      <Icon color={color.inkFaint} name={icon} size={15} />
    </Pressable>
  );
}

function Step({ step, last, editsPlan, onDone, onEdit, onCancel }: StepProps): ReactElement {
  const { subQuest, time, place, next, over } = step;
  return (
    <View style={[styles.step, over && styles.over]} testID="plan-step">
      <View style={styles.rail}>
        <View style={[styles.dot, next && styles.nextDot]} />
        <View style={[styles.line, last && styles.lineEnd]} />
      </View>
      <View style={styles.words}>
        {time === '' ? null : <Text style={[styles.time, next && styles.nextTime]}>{time}</Text>}
        <Text style={styles.what}>{subQuest.title}</Text>
        {place === '' ? null : <Text style={styles.place}>{place}</Text>}
      </View>
      {over ? null : <SmallButton icon="check" label="완료로 표시" onPress={onDone} />}
      {editsPlan && !subQuest.attending ? (
        <>
          <SmallButton icon="edit" label="일정 수정" onPress={onEdit} />
          <SmallButton icon="x" label="일정 삭제" onPress={onCancel} />
        </>
      ) : null}
    </View>
  );
}

function AddButton({ onPress }: { onPress: () => void }): ReactElement {
  return (
    <Pressable accessibilityLabel="일정 추가" accessibilityRole="button" onPress={onPress} style={styles.add}>
      <Icon color={color.snuBlue} name="plus" size={14} />
      <Text style={styles.addWords}>추가</Text>
    </Pressable>
  );
}

interface StepsProps extends PlanSectionProps {
  onEdit: (subQuest: SubQuest) => void;
  onCancel: (subQuest: SubQuest) => void;
}

function Steps({ room, actions, onEdit, onCancel }: StepsProps): ReactElement {
  const { quest, plan, editsPlan } = room;
  return (
    <View>
      {plan.length === 0 ? <Text style={styles.empty}>일정 없음</Text> : null}
      {plan.map((step, index) => (
        <Step
          editsPlan={editsPlan}
          key={step.subQuest.id}
          last={index === plan.length - 1}
          onCancel={() => {
            onCancel(step.subQuest);
          }}
          onDone={() => void actions.markDone(quest.id, step.subQuest)}
          onEdit={() => {
            onEdit(step.subQuest);
          }}
          step={step}
        />
      ))}
    </View>
  );
}

interface FormProps extends PlanSectionProps {
  editing: NonNullable<Editing>;
  onClose: () => void;
}

// The form for the Sub Quest added or edited. It closes once the main server took it.
function Form({ room, actions, editing, onClose }: FormProps): ReactElement {
  const questId = room.quest.id;
  return (
    <PlanForm
      editing={editing.kind === 'edit' ? editing.subQuest : null}
      key={editing.kind === 'edit' ? editing.subQuest.id : editing.key}
      onCancel={onClose}
      onSave={async (content) => {
        const saved =
          editing.kind === 'add'
            ? await actions.addSubQuest(questId, content, editing.key)
            : await actions.editSubQuest(questId, editing.subQuest.id, content);
        if (saved) {
          onClose();
        }
        return saved;
      }}
    />
  );
}

interface CancelDialogProps {
  visible: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

function CancelDialog({ visible, onConfirm, onClose }: CancelDialogProps): ReactElement {
  return (
    <Dialog
      cancelLabel="취소"
      confirmLabel="삭제"
      onCancel={onClose}
      onConfirm={() => {
        onConfirm();
        onClose();
      }}
      title="일정을 삭제할까요?"
      tone="danger"
      visible={visible}
    />
  );
}

// The room's `일정`: the Sub Quests on a timeline, the Leader's controls and the inline form.
export function PlanSection({ room, actions }: PlanSectionProps): ReactElement {
  const { quest, editsPlan } = room;
  const [editing, setEditing] = useState<Editing>(null);
  const [cancelling, setCancelling] = useState<SubQuest | null>(null);
  return (
    <View accessibilityLabel="일정" style={styles.section}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.heading}>
          일정
        </Text>
        {editsPlan ? (
          <AddButton
            onPress={() => {
              setEditing({ kind: 'add', key: newIdempotencyKey() });
            }}
          />
        ) : null}
      </View>
      <Steps
        actions={actions}
        onCancel={setCancelling}
        onEdit={(subQuest) => {
          setEditing({ kind: 'edit', subQuest });
        }}
        room={room}
      />
      {editsPlan && editing !== null ? (
        <Form
          actions={actions}
          editing={editing}
          onClose={() => {
            setEditing(null);
          }}
          room={room}
        />
      ) : null}
      <CancelDialog
        onClose={() => {
          setCancelling(null);
        }}
        onConfirm={() => {
          if (cancelling !== null) {
            void actions.cancelSubQuest(quest.id, cancelling);
          }
        }}
        visible={cancelling !== null}
      />
    </View>
  );
}

const DOT = 12;

const styles = StyleSheet.create({
  section: { gap: space[3] },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { fontFamily: font.semiBold, fontSize: 18, lineHeight: 26, color: color.ink },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    height: 36,
    paddingHorizontal: space[3],
    borderRadius: radius.full,
    backgroundColor: color.blue50,
  },
  addWords: { fontFamily: font.semiBold, fontSize: 13, lineHeight: 18, color: color.snuBlue },
  empty: {
    padding: space[4],
    borderRadius: radius.md,
    backgroundColor: color.surfaceSubtle,
    fontFamily: font.medium,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    color: color.inkFaint,
  },
  step: { flexDirection: 'row', gap: space[3] },
  over: { opacity: 0.45 },
  rail: { alignItems: 'center', width: 20 },
  dot: {
    width: DOT,
    height: DOT,
    marginTop: space[1],
    borderWidth: 2,
    borderColor: color.inkFaint,
    borderRadius: radius.full,
    backgroundColor: color.surface,
  },
  nextDot: { borderWidth: 0, backgroundColor: color.party, boxShadow: `0 0 0 4px ${color.partySoft}` },
  line: { flexGrow: 1, width: 2, marginTop: space[1], backgroundColor: color.border },
  lineEnd: { backgroundColor: 'transparent' },
  words: { flex: 1, paddingBottom: space[4] },
  time: { fontFamily: font.bold, fontSize: 12, lineHeight: 16, color: color.inkMuted },
  nextTime: { color: color.party },
  what: { fontFamily: font.semiBold, fontSize: 15, lineHeight: 22, color: color.ink },
  place: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: color.inkMuted },
  small: { alignItems: 'center', justifyContent: 'center', width: 32, height: 32 },
});
