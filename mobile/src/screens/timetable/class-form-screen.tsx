/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { router } from 'expo-router';
import { type ReactElement, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { isRefusal } from '@/api/errors';
import type { TimetableClass } from '@/api/types';
import {
  Button,
  color,
  Dialog,
  ErrorState,
  font,
  FullScreenPanel,
  LoadingState,
  space,
  TextField,
  useToast,
} from '@/design-system';
import {
  type ClassDraft,
  crossingLines,
  draftOf,
  EMPTY_DRAFT,
  endNotAfterStart,
  isReady,
  placeText,
} from '@/features/timetable/class-form';
import { type Timetable, useClassChanges, useTimetable } from '@/features/timetable/use-timetable';
import { PlacePicker } from '../places/place-picker';
import { CrossingWarning, DayToggles, PlaceButton, TimeRow } from './class-fields';

function titleOf(classId: string | null): string {
  return classId === null ? '수업 추가' : '수업 수정';
}

// Words that no frame draws.
function refusalWords(error: unknown): string {
  if (isRefusal(error, 409, 'TIMETABLE_FULL')) {
    return '수업은 15개까지 넣을 수 있어요';
  }
  if (isRefusal(error, 404, 'PLACE_NOT_FOUND')) {
    return '장소를 다시 골라 주세요';
  }
  return '저장하지 못했어요. 다시 시도해 주세요';
}

// Saves or deletes, then goes back to the timetable with a toast. A refusal leaves the form open with its toast.
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
      () => {
        setWorking(false);
        showToast('삭제하지 못했어요. 다시 시도해 주세요');
      },
    );
  };
  return { working, save, remove };
}

type Change = (changed: Partial<ClassDraft>) => void;

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

function TimeSection({
  draft,
  change,
  crossings,
}: {
  draft: ClassDraft;
  change: Change;
  crossings: string[];
}): ReactElement {
  const endWrong = endNotAfterStart(draft);
  return (
    <View style={styles.timeGroup}>
      <TimeRow
        end={draft.end}
        endWrong={endWrong}
        onEnd={(end) => {
          change({ end });
        }}
        onStart={(start) => {
          change({ start });
        }}
        start={draft.start}
      />
      {endWrong ? (
        <Text accessibilityRole="alert" style={styles.error}>
          종료 시각이 시작 시각보다 늦어야 해요
        </Text>
      ) : null}
      {crossings.length > 0 ? <CrossingWarning lines={crossings} /> : null}
    </View>
  );
}

interface FieldsProps {
  draft: ClassDraft;
  change: Change;
  crossings: string[];
  onPickPlace: () => void;
}

function FormFields({ draft, change, crossings, onPickPlace }: FieldsProps): ReactElement {
  return (
    <View style={styles.body}>
      <TextField
        label="과목명"
        maxLength={30}
        onChangeText={(name) => {
          change({ name });
        }}
        placeholder="과목명"
        value={draft.name}
      />
      <DayToggles
        days={draft.days}
        onChange={(days) => {
          change({ days });
        }}
      />
      <TimeSection change={change} crossings={crossings} draft={draft} />
      <PlaceButton chosen={draft.place === null ? null : placeText(draft.place)} onPress={onPickPlace} />
      <TextField
        label="강의실 선택"
        maxLength={20}
        onChangeText={(room) => {
          change({ room });
        }}
        placeholder="예: 118호"
        value={draft.room}
      />
    </View>
  );
}

function ClassForm({ lesson, timetable }: { lesson: TimetableClass | null; timetable: Timetable }): ReactElement {
  const classId = lesson?.id ?? null;
  const [draft, setDraft] = useState(() => (lesson === null ? EMPTY_DRAFT : draftOf(lesson, timetable.places)));
  const [picking, setPicking] = useState(false);
  const { working, save, remove } = useFormActions(classId);
  const change: Change = (changed) => {
    setDraft((held) => ({ ...held, ...changed }));
  };
  const closePicker = (): void => {
    setPicking(false);
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
          change={change}
          crossings={crossingLines(draft, timetable.classes, classId)}
          draft={draft}
          onPickPlace={() => {
            setPicking(true);
          }}
        />
      </FullScreenPanel>
      {picking ? (
        <PlacePicker
          mode="class"
          onClose={closePicker}
          onPick={(place) => {
            change({ place });
            closePicker();
          }}
          picked={draft.place?.id ?? null}
        />
      ) : null}
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
  timeGroup: { gap: space[2] },
  error: { fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: color.danger },
  footer: { flexDirection: 'row', gap: space[2] },
  saveSlot: { flex: 1 },
});
