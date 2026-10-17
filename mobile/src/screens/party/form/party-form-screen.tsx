/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-09  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-17  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { router, useIsFocused } from 'expo-router';
import { type ReactElement, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { globalEventAnnouncersQuery, globalEventsQuery, questQuery } from '@/api/queries';
import { Button, ErrorState, FullScreenPanel, LoadingState, space, TextField, useToastAbove } from '@/design-system';
import { WhenField, WhereField } from '../../room/plan-form';
import { EventField, EventPicker } from './event-field';
import { FriendPicker } from './friend-picker';
import { BoardField, CapacityField, DescriptionField, VisibilityField } from './party-form-fields';
import { PhotoField } from './photo-field';
import { TagField } from './tag-field';
import { eventOfQuest, type FormProps, type FormState, friendsHint, useFormState } from './use-form-state';

const FOOTER = 81;

function When({ state }: { state: FormState }): ReactElement {
  return (
    <WhenField
      onPick={(startsAt) => {
        state.change({ startsAt });
      }}
      startsAt={state.form.startsAt}
    />
  );
}

function Where({ state }: { state: FormState }): ReactElement {
  return <WhereField onPicked={state.setPicked} onWords={state.setWords} picked={state.picked} words={state.words} />;
}

interface FieldsProps {
  state: FormState;
  onChooseEvent: () => void;
}

// The frame's order: 사진, 관련 행사, 제목, 본문, 언제, 인원, 어디서, 공개 범위, 게시판, 친구 초대, 태그.
function Fields({ state, onChooseEvent }: FieldsProps): ReactElement {
  const { form, change } = state;
  return (
    <View style={styles.body}>
      <PhotoField
        onChange={(photo) => {
          change({ photo });
        }}
        photo={form.photo}
      />
      <EventField
        event={form.event}
        onChoose={onChooseEvent}
        onClear={() => {
          state.pickEvent(null);
        }}
      />
      <TextField
        label="제목"
        maxLength={30}
        onChangeText={(next) => {
          change({ title: next });
        }}
        placeholder="제목"
        value={form.title}
      />
      <DescriptionField form={form} onChange={change} />
      <When state={state} />
      <CapacityField form={form} least={state.least} onChange={change} />
      <Where state={state} />
      <VisibilityField form={form} onChange={change} />
      {form.visibility === 'public' ? <BoardField form={form} onChange={change} /> : null}
      <FriendPicker
        chosen={state.chosen}
        friends={state.friends}
        hint={friendsHint(form, state.chosen.length)}
        most={state.most}
        onChosen={state.setChosen}
      />
      <TagField
        onChange={(tags) => {
          change({ tags });
        }}
        tags={form.tags}
      />
    </View>
  );
}

function Form(props: FormProps): ReactElement {
  const state = useFormState(props);
  const [picking, setPicking] = useState(false);
  useToastAbove(FOOTER, useIsFocused());
  const { quest } = props;
  const editing = quest !== null;
  if (picking) {
    const back = (): void => {
      setPicking(false);
    };
    return (
      <EventPicker
        chosen={state.form.event}
        onBack={back}
        onPick={(event) => {
          state.pickEvent(event);
          back();
        }}
      />
    );
  }
  const title = editing ? (quest.joinPolicy === 'closed' ? '파티 수정' : '모집글 수정') : '파티 만들기';
  const open = state.form.visibility === 'public';
  const submitWords = editing ? '수정 완료' : open ? '파티 올리기' : '파티 만들기';
  return (
    <FullScreenPanel
      footer={
        <Button disabled={!state.ready} full onPress={state.submit} size="lg">
          {submitWords}
        </Button>
      }
      leave={{ kind: 'back', onPress: router.back }}
      title={title}
    >
      <Fields
        onChooseEvent={() => {
          setPicking(true);
        }}
        state={state}
      />
    </FullScreenPanel>
  );
}

// 파티 만들기, the frames `PartyCreate` and `PartyAppt`, the latter opened from a Friend; with a Quest, its edit mode.
export function PartyFormScreen({
  questId,
  eventId,
  friendId,
}: {
  questId: string | null;
  eventId: string | null;
  friendId: string | null;
}): ReactElement {
  if (questId === null) {
    return <Form eventId={eventId} friendId={friendId} quest={null} questEvent={null} />;
  }
  return <EditedForm questId={questId} />;
}

function EditedForm({ questId }: { questId: string }): ReactElement {
  const { data: quest, isPending, refetch } = useQuery(questQuery(questId));
  const events = useQuery(globalEventsQuery);
  const announcers = useQuery(globalEventAnnouncersQuery).data ?? [];
  if (quest !== undefined && !events.isPending) {
    const questEvent = eventOfQuest(quest, events.data, announcers);
    return <Form eventId={null} friendId={null} quest={quest} questEvent={questEvent} />;
  }
  return (
    <FullScreenPanel leave={{ kind: 'back', onPress: router.back }} title="모집글 수정">
      {isPending || events.isPending ? <LoadingState /> : <ErrorState onRetry={() => void refetch()} />}
    </FullScreenPanel>
  );
}

const styles = StyleSheet.create({
  body: { gap: space[5], padding: space[4] },
});
