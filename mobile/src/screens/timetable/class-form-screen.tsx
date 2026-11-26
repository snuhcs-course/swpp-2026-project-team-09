/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-17  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-18  Opus 5.5   prompted by TaeHyun79
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { router } from 'expo-router';
import { type ReactElement, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { isRefusal } from '@/api/errors';
import type { TimetableClass } from '@/api/types';
import { Button, Dialog, ErrorState, FullScreenPanel, LoadingState, space, TextField, useToast } from '@/design-system';
import {
  type ClassDraft,
  crossingLines,
  draftOf,
  EMPTY_DRAFT,
  EMPTY_SLOT,
  isReady,
  type SlotDraft,
} from '@/features/timetable/class-form';
import { type Timetable, useClassChanges, useTimetable } from '@/features/timetable/use-timetable';
import { NOT_MOVED } from '@/features/timetable/use-versions';
import { VersionsRefusal } from '@/features/timetable/versions';
import { PlacePicker } from '../places/place-picker';
import { CrossingWarning } from './class-fields';
import { AddSlot, SlotCard } from './slot-card';

function titleOf(classId: string | null): string {
  return classId === null ? '수업 추가' : '수업 수정';
}

// Words that no frame draws.
function refusalWords(error: unknown): string {
  if (error instanceof VersionsRefusal) {
    return NOT_MOVED;
  }
  if (isRefusal(error, 409, 'TIMETABLE_FULL')) {
    return '수업은 15개까지 넣을 수 있어요';
  }
  if (isRefusal(error, 404, 'PLACE_NOT_FOUND')) {
    return '장소를 다시 골라 주세요';
  }
  return '저장하지 못했어요. 다시 시도해 주세요';
}

// Saves or deletes, then goes back where the form was opened from, with a toast. A refusal leaves the form open with
// its toast.
function useFormActions(classId: string | null): {
  working: boolean;
  save: (draft: ClassDraft) => void;
  remove: () => void;
} {
  const changes = useClassChanges();
  const showToast = useToast();
  const [working, setWorking] = useState(false);
  const saved = ({ overlaps }: TimetableClass): void => {
    router.back();
    if (overlaps.length > 0) {
      showToast('저장했어요 · 겹치는 수업이 있어요', undefined, 'alert');
    } else {
      showToast(classId === null ? '수업을 추가했어요' : '수업을 수정했어요');
    }
  };
  const save = (draft: ClassDraft): void => {
    setWorking(true);
    changes.save(classId, draft).then(saved, (error: unknown) => {
      setWorking(false);
      showToast(refusalWords(error));
    });
  };
  const remove = (): void => {
    if (classId === null) {
      return;
    }
    setWorking(true);
    changes.remove(classId).then(
      () => {
        router.back();
        showToast('수업을 삭제했어요');
      },
      (error: unknown) => {
        setWorking(false);
        showToast(error instanceof VersionsRefusal ? NOT_MOVED : '삭제하지 못했어요. 다시 시도해 주세요');
      },
    );
  };
  return { working, save, remove };
}

interface DeleteDialogProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

function DeleteDialog({ visible, onClose, onConfirm }: DeleteDialogProps): ReactElement {
  return (
    <Dialog
      cancelLabel="취소"
      confirmLabel="삭제"
      onCancel={onClose}
      onConfirm={() => {
        onClose();
        onConfirm();
      }}
      title="이 수업을 삭제할까요?"
      tone="danger"
      visible={visible}
    />
  );
}

interface FooterProps {
  editing: boolean;
  working: boolean;
  ready: boolean;
  onDelete: () => void;
  onSave: () => void;
}

// `저장`, with `삭제` beside it on an edit, which asks first.
function FormFooter({ editing, working, ready, onDelete, onSave }: FooterProps): ReactElement {
  const [asking, setAsking] = useState(false);
  return (
    <View style={styles.footer}>
      {editing ? (
        <Button
          disabled={working}
          onPress={() => {
            setAsking(true);
          }}
          size="lg"
          variant="danger"
        >
          삭제
        </Button>
      ) : null}
      <DeleteDialog
        onClose={() => {
          setAsking(false);
        }}
        onConfirm={onDelete}
        visible={asking}
      />
      <View style={styles.saveSlot}>
        <Button disabled={working || !ready} full onPress={onSave} size="lg">
          저장
        </Button>
      </View>
    </View>
  );
}

type SetDraft = (next: (held: ClassDraft) => ClassDraft) => void;

interface FieldsProps {
  draft: ClassDraft;
  setDraft: SetDraft;
  crossings: string[];
  onPickPlace: (index: number) => void;
}

// 과목명, then a card for each time slot and `다른 시간대 추가`, then the classes the slots cross.
function FormFields({ draft, setDraft, crossings, onPickPlace }: FieldsProps): ReactElement {
  const changeSlot = (index: number, changed: Partial<SlotDraft>): void => {
    setDraft((held) => ({
      ...held,
      slots: held.slots.map((slot, other) => (other === index ? { ...slot, ...changed } : slot)),
    }));
  };
  return (
    <View style={styles.body}>
      <TextField
        label="과목명"
        maxLength={30}
        onChangeText={(name) => {
          setDraft((held) => ({ ...held, name }));
        }}
        placeholder="과목명"
        value={draft.name}
      />
      <View style={styles.slots}>
        {draft.slots.map((_, index) => (
          <SlotCard
            draft={draft}
            index={index}
            key={index}
            onChange={(changed) => {
              changeSlot(index, changed);
            }}
            onPickPlace={() => {
              onPickPlace(index);
            }}
            onRemove={() => {
              setDraft((held) => ({ ...held, slots: held.slots.filter((__, other) => other !== index) }));
            }}
          />
        ))}
        <AddSlot
          onAdd={() => {
            setDraft((held) => ({ ...held, slots: [...held.slots, EMPTY_SLOT] }));
          }}
          slots={draft.slots.length}
        />
      </View>
      {crossings.length > 0 ? <CrossingWarning lines={crossings} /> : null}
    </View>
  );
}

function ClassForm({ lesson, timetable }: { lesson: TimetableClass | null; timetable: Timetable }): ReactElement {
  const classId = lesson?.id ?? null;
  const [draft, setDraft] = useState(() => (lesson === null ? EMPTY_DRAFT : draftOf(lesson, timetable.places)));
  // The slot whose Place is being picked, or null.
  const [picking, setPicking] = useState<number | null>(null);
  const { working, save, remove } = useFormActions(classId);
  const closePicker = (): void => {
    setPicking(null);
  };
  const footer = (
    <FormFooter
      editing={classId !== null}
      onDelete={remove}
      onSave={() => {
        save(draft);
      }}
      ready={isReady(draft)}
      working={working}
    />
  );
  return (
    <View style={styles.screen}>
      <FullScreenPanel footer={footer} leave={{ kind: 'close', onPress: router.back }} subtle title={titleOf(classId)}>
        <FormFields
          crossings={crossingLines(draft, timetable.classes, classId)}
          draft={draft}
          onPickPlace={setPicking}
          setDraft={setDraft}
        />
      </FullScreenPanel>
      {picking === null ? null : (
        <PlacePicker
          onClose={closePicker}
          onPick={(place) => {
            setDraft((held) => ({
              ...held,
              slots: held.slots.map((slot, index) => (index === picking ? { ...slot, place } : slot)),
            }));
            closePicker();
          }}
          picked={draft.slots[picking]?.place?.id ?? null}
        />
      )}
    </View>
  );
}

// 수업 추가 and 수업 수정, the `TimetableClassForm` frame, for the class `classId` or a new one.
export function ClassFormScreen({ classId }: { classId: string | null }): ReactElement {
  const { data, isPending, refetch } = useTimetable();
  const lesson = data?.classes.find(({ id }) => id === classId) ?? null;
  if (data === undefined || (classId !== null && lesson === null)) {
    return (
      <FullScreenPanel leave={{ kind: 'close', onPress: router.back }} subtle title={titleOf(classId)}>
        {isPending ? <LoadingState /> : <ErrorState onRetry={refetch} />}
      </FullScreenPanel>
    );
  }
  return <ClassForm lesson={lesson} timetable={data} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { gap: 18, padding: space[4], paddingBottom: space[6] },
  slots: { gap: space[3] },
  footer: { flexDirection: 'row', gap: space[2] },
  saveSlot: { flex: 1 },
});
