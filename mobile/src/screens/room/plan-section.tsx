/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-09  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type ReactElement, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { newIdempotencyKey } from '@/api/idempotency-key';
import type { SubQuest } from '@/api/types';
import { color, font, Icon, type IconName, radius, space } from '@/design-system';
import { type PointOnMap, pointOnMap } from '@/features/places/point-on-map';
import type { PlanStepView, RoomView } from '@/features/quests/room-adapter';
import { PlaceWords, usePlaceOnMap } from '../place-map/place-on-map-sheet';
import { HelpButton, PLAN_HELP } from './help-bubble';
import { PlanForm } from './plan-form';
import { SectionTitle } from './section-title';
import type { RoomActions } from './use-room-actions';

interface PlanSectionProps {
  room: RoomView;
  actions: RoomActions;
}

// The form that is open: a new Sub Quest with the key kept for the retries of that one add, or the one edited.
type Editing = { kind: 'add'; key: string } | { kind: 'edit'; subQuest: SubQuest } | null;

interface StepProps {
  step: PlanStepView;
  editsPlan: boolean;
  onEdit: () => void;
  onCancel: () => void;
  // A place picked on the map opens it on a small map (P06 ticket 27).
  onPlace: (point: PointOnMap) => void;
}

interface SmallButtonProps {
  icon: IconName;
  label: string;
  onPress: () => void;
}

function SmallButton({ icon, label, onPress }: SmallButtonProps): ReactElement {
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

// A step after its clock, orange for the step now or next and grey once behind (`plan-steps`).
function Step({ step, editsPlan, onEdit, onCancel, onPlace }: StepProps): ReactElement {
  const { subQuest, time, place, next, over } = step;
  return (
    <View style={[styles.step, over && styles.over]} testID="plan-step">
      <Icon color={next ? color.party : color.inkFaint} name="clock" size={18} />
      <View style={styles.words}>
        {time === '' ? null : <Text style={[styles.time, next && styles.nextTime]}>{time}</Text>}
        <Text style={styles.what}>{subQuest.title}</Text>
        {place === '' ? null : (
          <PlaceWords onOpen={onPlace} point={pointOnMap(subQuest.place)}>
            <Text style={styles.place}>{place}</Text>
          </PlaceWords>
        )}
      </View>
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

function Steps({ room, onEdit, onCancel }: StepsProps): ReactElement {
  const { plan, editsPlan } = room;
  const placeOnMap = usePlaceOnMap();
  return (
    <View style={styles.steps}>
      {plan.length === 0 ? <Text style={styles.empty}>일정 없음</Text> : null}
      {plan.map((step) => (
        <Step
          editsPlan={editsPlan}
          key={step.subQuest.id}
          onCancel={() => {
            onCancel(step.subQuest);
          }}
          onEdit={() => {
            onEdit(step.subQuest);
          }}
          onPlace={placeOnMap.open}
          step={step}
        />
      ))}
      {placeOnMap.sheet}
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

// The room's `일정`: the Sub Quests, each after a clock, the Leader's controls and the inline form. A step is deleted at
// once, without a question and without an undo, as `PartyDetail` draws it.
export function PlanSection({ room, actions }: PlanSectionProps): ReactElement {
  const { quest, editsPlan } = room;
  const [editing, setEditing] = useState<Editing>(null);
  return (
    <View accessibilityLabel="일정" style={styles.section}>
      <SectionTitle
        after={<HelpButton help={PLAN_HELP} size={18} />}
        end={
          editsPlan ? (
            <AddButton
              onPress={() => {
                setEditing({ kind: 'add', key: newIdempotencyKey() });
              }}
            />
          ) : null
        }
        icon="clock"
      >
        일정
      </SectionTitle>
      <Steps
        actions={actions}
        onCancel={(subQuest) => void actions.cancelSubQuest(quest.id, subQuest)}
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
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space[3] },
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
  steps: { gap: space[4] },
  step: { flexDirection: 'row', gap: space[3] },
  over: { opacity: 0.45 },
  words: { flex: 1 },
  time: { fontFamily: font.bold, fontSize: 12, lineHeight: 16, color: color.inkMuted },
  nextTime: { color: color.party },
  what: { fontFamily: font.semiBold, fontSize: 15, lineHeight: 22, color: color.ink },
  place: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: color.inkMuted },
  small: { alignItems: 'center', justifyContent: 'center', width: 32, height: 32 },
});
