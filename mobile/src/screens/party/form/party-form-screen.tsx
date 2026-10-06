import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useIsFocused } from 'expo-router';
import { type ReactElement, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { apiClient } from '@/api/client';
import { newIdempotencyKey } from '@/api/idempotency-key';
import { friendsQuery, QUESTS_KEY, RECRUITING_KEY, questQuery, SENT_INVITATIONS_KEY } from '@/api/queries';
import type { Friend, Quest } from '@/api/types';
import {
  Button,
  color,
  ErrorState,
  font,
  FullScreenPanel,
  LoadingState,
  space,
  TextField,
  useToast,
  useToastAbove,
} from '@/design-system';
import type { PickedPlace } from '@/features/places/picked-place';
import { changeOf, emptyForm, formOf, invitable, isReady, makingOf, type PartyForm } from '@/features/party/making';
import { refusalWords } from '@/features/quests/refusals';
import { placeOf, WhenField, WhereField } from '../../room/plan-form';
import { showMine } from '../use-party-actions';
import { FriendPicker } from './friend-picker';
import { BoardField, CapacityField, DescriptionField, VisibilityField } from './party-form-fields';

const FOOTER = 81;
const NOT_SAVED = '저장하지 못했어요. 다시 시도해 주세요';

// Invites each Friend and counts those the main server refused.
async function invite(questId: string, friends: readonly string[]): Promise<number> {
  const answers = await Promise.allSettled(friends.map((userId) => apiClient.inviteToQuest(questId, userId)));
  return answers.filter(({ status }) => status === 'rejected').length;
}

function toastOf(form: PartyForm, editing: boolean, invited: number, missed: number): string {
  const main = editing
    ? '모집글을 수정했어요'
    : form.visibility === 'private'
      ? `비공개 파티를 만들었어요 · ${String(invited)}명에게 초대 요청`
      : '파티를 올렸어요';
  return missed === 0 ? main : `${main} · ${String(missed)}명은 초대하지 못했어요`;
}

function friendsHint(form: PartyForm, chosen: number): string {
  if (chosen > 0) {
    return `${String(chosen)}명에게 요청`;
  }
  return form.visibility === 'private' ? '1명 이상' : '선택';
}

interface FormProps {
  // The Quest edited, or null for a new one.
  quest: Quest | null;
}

// Sends the form: makes the Quest or changes it, then invites the chosen Friends. True once it was taken.
function useSend({ quest }: FormProps): (form: PartyForm, friends: string[]) => Promise<boolean> {
  const queryClient = useQueryClient();
  const showToast = useToast();
  return async (form, friends) => {
    let questId: string;
    try {
      if (quest === null) {
        questId = (await apiClient.makeQuest(makingOf(form), newIdempotencyKey())).id;
      } else {
        const change = changeOf(quest, form);
        if (Object.keys(change).length > 0) {
          await apiClient.changeQuest(quest.id, change);
        }
        questId = quest.id;
      }
    } catch (error) {
      showToast(refusalWords(error, {}, NOT_SAVED));
      return false;
    }
    const missed = await invite(questId, friends);
    showToast(toastOf(form, quest !== null, friends.length - missed, missed));
    for (const queryKey of [QUESTS_KEY, RECRUITING_KEY, SENT_INVITATIONS_KEY]) {
      void queryClient.invalidateQueries({ queryKey });
    }
    return true;
  };
}

interface FormState {
  form: PartyForm;
  change: (next: Partial<PartyForm>) => void;
  friends: Friend[];
  chosen: string[];
  setChosen: (ids: string[]) => void;
  most: number;
  words: string;
  setWords: (words: string) => void;
  picked: PickedPlace | null;
  setPicked: (place: PickedPlace | null) => void;
  unplaced: boolean;
  ready: boolean;
  submit: () => void;
}

// What the form holds, and its sending: back to the room or the post after an edit, to 내 파티 after making one.
function useFormState(quest: Quest | null): FormState {
  const editing = quest !== null;
  const send = useSend({ quest });
  const holders = quest?.holders ?? [];
  const friends = (useQuery(friendsQuery).data ?? []).filter(({ id }) => !holders.some((holder) => holder.id === id));
  const [form, setForm] = useState<PartyForm>(() => (quest === null ? emptyForm() : formOf(quest)));
  const [chosen, setChosen] = useState<string[]>([]);
  const [words, setWords] = useState('');
  const [picked, setPicked] = useState<PickedPlace | null>(null);
  const [saving, setSaving] = useState(false);
  const unplaced = words.trim() !== '' && picked === null;
  const most = invitable(form, Math.max(holders.length, 1));
  const shownChosen = chosen.slice(0, most);
  return {
    form,
    change: (next) => {
      setForm((held) => ({ ...held, ...next }));
    },
    friends,
    chosen: shownChosen,
    setChosen,
    most,
    words,
    setWords,
    picked,
    setPicked,
    unplaced,
    ready: isReady(form, shownChosen.length, editing) && !unplaced && !saving,
    submit: () => {
      setSaving(true);
      void send({ ...form, place: placeOf(words, picked) }, shownChosen).then((sent) => {
        setSaving(false);
        if (sent) {
          (editing ? router.back : showMine)();
        }
      });
    },
  };
}

function Fields({ state, editing }: { state: FormState; editing: boolean }): ReactElement {
  const { form, change } = state;
  const open = form.visibility === 'public';
  return (
    <View style={styles.body}>
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
      {editing ? null : (
        <WhenField
          onPick={(startsAt) => {
            change({ startsAt });
          }}
          startsAt={form.startsAt}
        />
      )}
      {open ? <CapacityField form={form} onChange={change} /> : null}
      {editing ? null : (
        <View style={styles.where}>
          <WhereField onPicked={state.setPicked} onWords={state.setWords} picked={state.picked} words={state.words} />
          {state.unplaced ? <Text style={styles.hint}>지도에서 위치를 골라 주세요</Text> : null}
        </View>
      )}
      <VisibilityField form={form} onChange={change} />
      {open ? <BoardField form={form} onChange={change} /> : null}
      <FriendPicker
        chosen={state.chosen}
        friends={state.friends}
        hint={friendsHint(form, state.chosen.length)}
        most={state.most}
        onChosen={state.setChosen}
      />
    </View>
  );
}

function Form({ quest }: FormProps): ReactElement {
  const state = useFormState(quest);
  useToastAbove(FOOTER, useIsFocused());
  const editing = quest !== null;
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
      <Fields editing={editing} state={state} />
    </FullScreenPanel>
  );
}

// 파티 만들기, the frames `PartyCreate` and `PartyAppt`; with a Quest, its edit mode.
export function PartyFormScreen({ questId }: { questId: string | null }): ReactElement {
  if (questId === null) {
    return <Form quest={null} />;
  }
  return <EditedForm questId={questId} />;
}

function EditedForm({ questId }: { questId: string }): ReactElement {
  const { data: quest, isPending, refetch } = useQuery(questQuery(questId));
  if (quest !== undefined) {
    return <Form quest={quest} />;
  }
  return (
    <FullScreenPanel leave={{ kind: 'back', onPress: router.back }} title="모집글 수정">
      {isPending ? <LoadingState /> : <ErrorState onRetry={() => void refetch()} />}
    </FullScreenPanel>
  );
}

const styles = StyleSheet.create({
  body: { gap: space[5], padding: space[4] },
  where: { gap: space[1] },
  hint: { fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: color.danger },
});
