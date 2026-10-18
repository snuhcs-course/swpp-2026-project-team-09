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
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { friendsQuery, globalEventAnnouncersQuery, globalEventsQuery } from '@/api/queries';
import type { ShownQuest } from '@/api/quest-parts-types';
import type { Friend, GlobalEvent } from '@/api/types';
import type { PickedPlace } from '@/features/places/picked-place';
import { usePlaceToSend } from '@/features/places/typed-place';
import {
  emptyForm,
  type FormEvent,
  formOf,
  invitable,
  isReady,
  leastCapacity,
  type PartyForm,
  planChangeOf,
  shownSubQuest,
  withEvent,
} from '@/features/party/making';
import { pickedOf } from '../../room/plan-form';
import { showMine } from '../use-party-actions';
import { useSend } from './use-send';

// What 파티 만들기 holds while the User fills it in, and its sending.

export interface FormProps {
  // The Quest edited, or null for a new one.
  quest: ShownQuest | null;
  // The edited Quest's event as the picker knows it.
  questEvent: FormEvent | null;
  // A new one's Global Event, chosen at the start.
  eventId: string | null;
  // A new one's Friend, invited at the start: the form opens as 비공개.
  friendId: string | null;
}

export function friendsHint(form: PartyForm, chosen: number): string {
  if (chosen > 0) {
    return `${String(chosen)}명에게 요청`;
  }
  return form.visibility === 'private' ? '1명 이상' : '선택';
}

export interface FormState {
  form: PartyForm;
  change: (next: Partial<PartyForm>) => void;
  friends: Friend[];
  chosen: string[];
  setChosen: (ids: string[]) => void;
  most: number;
  // The least `인원`.
  least: number;
  words: string;
  setWords: (words: string) => void;
  picked: PickedPlace | null;
  setPicked: (place: PickedPlace | null) => void;
  ready: boolean;
  submit: () => void;
  pickEvent: (event: FormEvent | null) => void;
  // The edited Quest is made for an event, which the main server cannot change.
  eventLocked: boolean;
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

// Choosing an event gives the form its title, time and tags, and `어디서` its place; `행사 빼기` clears the time and
// place and leaves the title and the tags. In an edit, the event fills the time, the place and the tags only, and
// `행사 빼기` leaves them: the main server cannot change a Quest's event.
function useEventPick(
  setForm: (change: (held: PartyForm) => PartyForm) => void,
  setWords: (words: string) => void,
  setPicked: (place: PickedPlace | null) => void,
  { eventId, editing }: { eventId: string | null; editing: boolean },
): (event: FormEvent | null) => void {
  const pickEvent = useCallback(
    (event: FormEvent | null) => {
      setForm((held) => withEvent(held, event, editing));
      if (editing && event === null) {
        return;
      }
      const place = event?.place ?? null;
      setWords(place ?? '');
      setPicked(
        event === null || place === null
          ? null
          : { placeId: null, position: { latitude: event.latitude, longitude: event.longitude }, words: place },
      );
    },
    [setForm, setWords, setPicked, editing],
  );
  usePreselected(eventId, pickEvent);
  return pickEvent;
}

// Where the edited Quest is, as `어디서` shows it at the start.
function useWhere(quest: ShownQuest | null): {
  words: string;
  setWords: (words: string) => void;
  picked: PickedPlace | null;
  setPicked: (place: PickedPlace | null) => void;
  changed: boolean;
} {
  const [start] = useState(() => {
    const subQuest = quest === null ? null : shownSubQuest(quest);
    return { words: subQuest?.place?.label ?? '', picked: pickedOf(subQuest) };
  });
  const [words, setWords] = useState(start.words);
  const [picked, setPicked] = useState(start.picked);
  return { words, setWords, picked, setPicked, changed: words !== start.words || picked !== start.picked };
}

type Where = ReturnType<typeof useWhere>;

// Sends the form with its place named: back to the room or the post after an edit, to 내 파티 after making one.
function useSubmit(
  quest: ShownQuest | null,
  where: Where,
  setSaving: (saving: boolean) => void,
): (form: PartyForm, friends: string[]) => void {
  const send = useSend(quest);
  const placeToSend = usePlaceToSend();
  return (form, friends) => {
    setSaving(true);
    void placeToSend(where.words, where.picked)
      .then((place) => {
        const sent = { ...form, place };
        return send(sent, friends, quest === null ? null : planChangeOf(quest, sent, where.changed));
      })
      .then((sent) => {
        setSaving(false);
        if (sent === 'taken') {
          (quest === null ? showMine : router.back)();
        }
      });
  };
}

// What the form holds, and its sending.
export function useFormState({ quest, questEvent, eventId, friendId }: FormProps): FormState {
  const editing = quest !== null;
  const holders = quest?.holders ?? [];
  const friends = (useQuery(friendsQuery).data ?? []).filter(({ id }) => !holders.some((holder) => holder.id === id));
  const [form, setForm] = useState<PartyForm>(() => {
    if (quest !== null) {
      return formOf(quest, questEvent);
    }
    return friendId === null ? emptyForm() : { ...emptyForm(), visibility: 'private' };
  });
  const [chosen, setChosen] = useState<string[]>(() => (quest === null && friendId !== null ? [friendId] : []));
  const where = useWhere(quest);
  const [saving, setSaving] = useState(false);
  const submit = useSubmit(quest, where, setSaving);
  const pickEvent = useEventPick(setForm, where.setWords, where.setPicked, {
    eventId: editing ? null : eventId,
    editing,
  });
  const holderCount = Math.max(holders.length, 1);
  const most = invitable(form, holderCount);
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
    least: leastCapacity(holderCount, shownChosen.length),
    words: where.words,
    setWords: where.setWords,
    picked: where.picked,
    setPicked: where.setPicked,
    ready: isReady(form, shownChosen.length, editing) && !saving,
    submit: () => {
      submit(form, shownChosen);
    },
    pickEvent,
    eventLocked: (quest?.globalEvent ?? null) !== null,
  };
}

// The edited Quest's event, from the Global Events where they hold it, else from what the Quest says of it: an event
// that has ended is no longer listed.
export function eventOfQuest(
  quest: ShownQuest,
  events: readonly GlobalEvent[] | undefined,
  announcers: readonly { eventId: string; announcer: string }[],
): FormEvent | null {
  const { globalEvent } = quest;
  if (globalEvent === null) {
    return null;
  }
  const source = announcers.find(({ eventId }) => eventId === globalEvent.id)?.announcer ?? null;
  const listed = events?.find(({ id }) => id === globalEvent.id);
  if (listed !== undefined) {
    return { ...listed, source };
  }
  const subQuest = quest.subQuests.find(({ attending }) => attending) ?? null;
  return {
    ...globalEvent,
    description: '',
    startsAt: subQuest?.startsAt ?? quest.createdAt ?? '',
    endsAt: subQuest?.endsAt ?? null,
    place: subQuest?.place?.label ?? null,
    latitude: subQuest?.place?.latitude ?? 0,
    longitude: subQuest?.place?.longitude ?? 0,
    sourceUrl: null,
    source,
  };
}
