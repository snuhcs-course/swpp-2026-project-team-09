// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-10-08 to 2026-10-09, prompted by fyoon46 and Jaehyun0320, reviewed by fyoon46 in #74
import { useQuery } from '@tanstack/react-query';
import { router, useIsFocused } from 'expo-router';
import { type ReactElement, useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { friendsQuery, globalEventAnnouncersQuery, globalEventsQuery, questQuery } from '@/api/queries';
import type { Friend, Quest } from '@/api/types';
import { Button, ErrorState, FullScreenPanel, LoadingState, space, TextField, useToastAbove } from '@/design-system';
import type { PickedPlace } from '@/features/places/picked-place';
import { usePlaceToSend } from '@/features/places/typed-place';
import {
  emptyForm,
  type FormEvent,
  formOf,
  invitable,
  isReady,
  type PartyForm,
  withEvent,
} from '@/features/party/making';
import { WhenField, WhereField } from '../../room/plan-form';
import { showMine } from '../use-party-actions';
import { EventField, EventPicker } from './event-field';
import { FriendPicker } from './friend-picker';
import { BoardField, CapacityField, DescriptionField, VisibilityField } from './party-form-fields';
import { useSend } from './use-send';

const FOOTER = 81;

interface FormProps {
  // The Quest edited, or null for a new one.
  quest: Quest | null;
  // A new one's Global Event, chosen at the start.
  eventId: string | null;
}

function friendsHint(form: PartyForm, chosen: number): string {
  if (chosen > 0) {
    return `${String(chosen)}명에게 요청`;
  }
  return form.visibility === 'private' ? '1명 이상' : '선택';
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
  ready: boolean;
  submit: () => void;
  pickEvent: (event: FormEvent | null) => void;
}

// The event of `/party-form?eventId=`, chosen once the Global Events are there.
function usePreselected(eventId: string | null, pick: (event: FormEvent) => void): void {
  const events = useQuery(globalEventsQuery).data;
  const announcers = useQuery(globalEventAnnouncersQuery).data;
  const done = useRef(false);
  useEffect(() => {
    const event = events?.find(({ id }) => id === eventId);
    if (done.current || event === undefined) {
      return;
    }
    done.current = true;
    pick({ ...event, source: announcers?.find((one) => one.eventId === event.id)?.announcer ?? null });
  }, [events, announcers, eventId, pick]);
}

// Choosing an event gives the form its title and time, and `어디서` its place; `행사 빼기` clears the time and place and
// leaves the title.
function useEventPick(
  setForm: (change: (held: PartyForm) => PartyForm) => void,
  setWords: (words: string) => void,
  setPicked: (place: PickedPlace | null) => void,
  eventId: string | null,
): (event: FormEvent | null) => void {
  const pickEvent = useCallback(
    (event: FormEvent | null) => {
      setForm((held) => withEvent(held, event));
      const place = event?.place ?? null;
      setWords(place ?? '');
      setPicked(
        event === null || place === null
          ? null
          : { placeId: null, position: { latitude: event.latitude, longitude: event.longitude }, words: place },
      );
    },
    [setForm, setWords, setPicked],
  );
  usePreselected(eventId, pickEvent);
  return pickEvent;
}

// What the form holds, and its sending: back to the room or the post after an edit, to 내 파티 after making one.
function useFormState(quest: Quest | null, eventId: string | null): FormState {
  const editing = quest !== null;
  const send = useSend(quest);
  const holders = quest?.holders ?? [];
  const friends = (useQuery(friendsQuery).data ?? []).filter(({ id }) => !holders.some((holder) => holder.id === id));
  const [form, setForm] = useState<PartyForm>(() => (quest === null ? emptyForm() : formOf(quest)));
  const [chosen, setChosen] = useState<string[]>([]);
  const [words, setWords] = useState('');
  const [picked, setPicked] = useState<PickedPlace | null>(null);
  const [saving, setSaving] = useState(false);
  const placeToSend = usePlaceToSend();
  const pickEvent = useEventPick(setForm, setWords, setPicked, editing ? null : eventId);
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
    ready: isReady(form, shownChosen.length, editing) && !saving,
    submit: () => {
      setSaving(true);
      void placeToSend(words, picked)
        .then((place) => send({ ...form, place }, shownChosen))
        .then((sent) => {
          setSaving(false);
          if (sent === 'taken') {
            (editing ? router.back : showMine)();
          }
        });
    },
    pickEvent,
  };
}

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
  editing: boolean;
  onChooseEvent: () => void;
}

function Fields({ state, editing, onChooseEvent }: FieldsProps): ReactElement {
  const { form, change } = state;
  const open = form.visibility === 'public';
  return (
    <View style={styles.body}>
      {editing ? null : (
        <EventField
          event={form.event}
          onChoose={onChooseEvent}
          onClear={() => {
            state.pickEvent(null);
          }}
        />
      )}
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
      {editing ? null : <When state={state} />}
      {open ? <CapacityField form={form} onChange={change} /> : null}
      {editing ? null : <Where state={state} />}
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

function Form({ quest, eventId }: FormProps): ReactElement {
  const state = useFormState(quest, eventId);
  const [picking, setPicking] = useState(false);
  useToastAbove(FOOTER, useIsFocused());
  const editing = quest !== null;
  if (picking) {
    const back = (): void => {
      setPicking(false);
    };
    return (
      <EventPicker
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
        editing={editing}
        onChooseEvent={() => {
          setPicking(true);
        }}
        state={state}
      />
    </FullScreenPanel>
  );
}

// 파티 만들기, the frames `PartyCreate` and `PartyAppt`; with a Quest, its edit mode.
export function PartyFormScreen({
  questId,
  eventId,
}: {
  questId: string | null;
  eventId: string | null;
}): ReactElement {
  if (questId === null) {
    return <Form eventId={eventId} quest={null} />;
  }
  return <EditedForm questId={questId} />;
}

function EditedForm({ questId }: { questId: string }): ReactElement {
  const { data: quest, isPending, refetch } = useQuery(questQuery(questId));
  if (quest !== undefined) {
    return <Form eventId={null} quest={quest} />;
  }
  return (
    <FullScreenPanel leave={{ kind: 'back', onPress: router.back }} title="모집글 수정">
      {isPending ? <LoadingState /> : <ErrorState onRetry={() => void refetch()} />}
    </FullScreenPanel>
  );
}

const styles = StyleSheet.create({
  body: { gap: space[5], padding: space[4] },
});
