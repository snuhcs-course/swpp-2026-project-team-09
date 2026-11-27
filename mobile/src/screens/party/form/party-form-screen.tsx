/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-09  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-17  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { router, useIsFocused } from 'expo-router';
import { type ReactElement, type RefObject, useRef, useState } from 'react';
import { Keyboard, Pressable, type ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  friendsQuery,
  globalEventAnnouncersQuery,
  globalEventsQuery,
  lobbyQuery,
  placesQuery,
  questQuery,
} from '@/api/queries';
import { Button, color, ErrorState, font, FullScreenPanel, LoadingState, space, useToastAbove } from '@/design-system';
import { type HeldProposal, heldProposal } from '@/features/party/held-proposal';
import type { Missing } from '@/features/party/making';
import { EventPicker } from './event-field';
import { FriendSheet } from './friend-sheet';
import { BoardRow, CapacityRow, FriendsRow, VisibilityRows } from './party-form-fields';
import { PlanBox } from './plan-box';
import { PosterRow, TextInPlace, TitleInPlace } from './preview-fields';
import { proposalStart } from './proposal-start';
import { eventOfQuest, type FormProps, type FormState, useFormState } from './use-form-state';

const FOOTER = 81;

type Frames = RefObject<Partial<Record<Missing, View | null>>>;

// The User as the 모집글 will name them: the Leader of the edited Quest, else the Lobby's profile.
function usePoster(props: FormProps): { name: string; department: string } {
  const profile = useQuery(lobbyQuery).data?.profile;
  const leader = props.quest?.leader ?? null;
  return { name: leader?.name ?? profile?.name ?? '', department: leader?.department ?? profile?.department ?? '' };
}

function frameRef(frames: Frames, missing: Missing): (node: View | null) => void {
  return (node) => {
    frames.current[missing] = node;
  };
}

interface SettingsProps {
  state: FormState;
  frames: Frames;
}

// '파티 설정': 인원, 공개 범위, and under 공개 참여 방식 and 게시판, then 친구 초대 and its sheet.
function Settings({ state, frames }: SettingsProps): ReactElement {
  const { form, change, marked } = state;
  const [inviting, setInviting] = useState(false);
  const open = form.visibility === 'public';
  const names = state.friends.filter(({ id }) => state.chosen.includes(id)).map(({ name }) => name);
  return (
    <View>
      <Text style={styles.section}>파티 설정</Text>
      <CapacityRow floor={state.floor} form={form} least={state.least} onChange={change} />
      <VisibilityRows form={form} onChange={change} />
      {open ? (
        <BoardRow
          board={form.board}
          frameRef={frameRef(frames, 'board')}
          marked={marked.includes('board')}
          onChange={change}
        />
      ) : null}
      <FriendsRow
        frameRef={frameRef(frames, 'friends')}
        marked={marked.includes('friends')}
        names={names}
        onOpen={() => {
          setInviting(true);
        }}
        required={!open && !state.editing}
      />
      <FriendSheet
        chosen={state.chosen}
        friends={state.friends}
        most={state.most}
        onChosen={state.setChosen}
        onClose={() => {
          setInviting(false);
        }}
        open={inviting}
      />
    </View>
  );
}

interface PreviewProps {
  state: FormState;
  props: FormProps;
  frames: Frames;
  onChooseEvent: () => void;
}

// The page, from the top: the title, the poster, the text, the box of the time, the place and the event, and
// '파티 설정'. A press outside a field drops the keyboard, and the words typed stay.
function Preview({ state, props, frames, onChooseEvent }: PreviewProps): ReactElement {
  const { form, change, marked } = state;
  const poster = usePoster(props);
  return (
    <Pressable accessible={false} onPress={Keyboard.dismiss} style={styles.body}>
      <View style={styles.post}>
        <TitleInPlace
          frameRef={frameRef(frames, 'title')}
          marked={marked.includes('title')}
          onChange={(title) => {
            change({ title });
          }}
          value={form.title}
        />
        <PosterRow department={poster.department} name={poster.name} />
        <TextInPlace
          frameRef={frameRef(frames, 'description')}
          marked={marked.includes('description')}
          onChange={(description) => {
            change({ description });
          }}
          required={form.visibility === 'public'}
          value={form.description}
        />
      </View>
      <PlanBox
        event={{ event: form.event, locked: state.eventLocked, onChoose: onChooseEvent }}
        onTime={(startsAt) => {
          change({ startsAt });
        }}
        place={{ words: state.words, picked: state.picked, onWords: state.setWords, onPicked: state.setPicked }}
        startsAt={form.startsAt}
      />
      <Settings frames={frames} state={state} />
    </Pressable>
  );
}

// Scrolls the page to the first required field left empty, a little above it.
function scrollTo(scroll: ScrollView | null, body: View | null, field: View | null | undefined): void {
  if (scroll === null || body === null || field === null || field === undefined) {
    return;
  }
  field.measureLayout(
    body,
    (_x, y) => {
      scroll.scrollTo({ y: Math.max(y - space[4], 0) });
    },
    () => {
      // The field is not on the page.
    },
  );
}

// The words of the app bar and of the button: an edit's, or a new one's, 공개 or 비공개.
function wordsOf(quest: FormProps['quest'], open: boolean): { title: string; submit: string } {
  if (quest !== null) {
    return { title: quest.joinPolicy === 'closed' ? '파티 수정' : '모집글 수정', submit: '수정 완료' };
  }
  return { title: '파티 만들기', submit: open ? '파티 올리기' : '파티 만들기' };
}

interface PageProps {
  state: FormState;
  props: FormProps;
  onChooseEvent: () => void;
}

// The form's page, its button always pressable: with a required field left empty, it marks them and scrolls to the
// first.
function Page({ state, props, onChooseEvent }: PageProps): ReactElement {
  const scroll = useRef<ScrollView>(null);
  const body = useRef<View>(null);
  const frames: Frames = useRef({});
  useToastAbove(FOOTER, useIsFocused());
  const words = wordsOf(props.quest, state.form.visibility === 'public');
  const submit = (): void => {
    Keyboard.dismiss();
    const [first] = state.submit();
    if (first !== undefined) {
      scrollTo(scroll.current, body.current, frames.current[first]);
    }
  };
  return (
    <FullScreenPanel
      footer={
        <Button busy={state.saving} full onPress={submit} size="lg">
          {words.submit}
        </Button>
      }
      footerHidesForKeyboard
      leave={{ kind: 'back', onPress: router.back }}
      scrollRef={scroll}
      title={words.title}
    >
      <View ref={body}>
        <Preview frames={frames} onChooseEvent={onChooseEvent} props={props} state={state} />
      </View>
    </FullScreenPanel>
  );
}

// The form, or the event picker over it, which keeps what the form holds.
function Form(props: FormProps): ReactElement {
  const state = useFormState(props);
  const [picking, setPicking] = useState(false);
  if (picking) {
    return (
      <EventPicker
        chosen={state.form.event}
        onBack={() => {
          setPicking(false);
        }}
        onPick={(event) => {
          state.pickEvent(event);
          setPicking(false);
        }}
      />
    );
  }
  return (
    <Page
      onChooseEvent={() => {
        setPicking(true);
      }}
      props={props}
      state={state}
    />
  );
}

// 파티 만들기, the frames `PartyCreate` and `PartyAppt`, the latter opened from a Friend; with a Quest, its edit mode;
// from the chat, filled with the Proposal held.
export function PartyFormScreen({
  questId,
  eventId,
  friendId,
  fromProposal,
}: {
  questId: string | null;
  eventId: string | null;
  friendId: string | null;
  fromProposal: boolean;
}): ReactElement {
  if (questId !== null) {
    return <EditedForm questId={questId} />;
  }
  const held = fromProposal ? heldProposal() : null;
  if (held !== null) {
    return <ProposalForm held={held} />;
  }
  return <Form eventId={eventId} friendId={friendId} proposal={null} quest={null} questEvent={null} />;
}

// The form filled with a Proposal, once who announced its event, the Places and the Friends are there to fill it.
function ProposalForm({ held }: { held: HeldProposal }): ReactElement {
  const announcers = useQuery(globalEventAnnouncersQuery);
  const places = useQuery(placesQuery);
  const friends = useQuery(friendsQuery);
  if (announcers.isPending || places.isPending || friends.isPending) {
    return (
      <FullScreenPanel leave={{ kind: 'back', onPress: router.back }} title="파티 만들기">
        <LoadingState />
      </FullScreenPanel>
    );
  }
  const start = proposalStart(held.proposal, {
    announcers: announcers.data ?? [],
    places: places.data ?? [],
    friends: friends.data ?? [],
  });
  return (
    <Form eventId={null} friendId={null} proposal={{ ...start, made: held.made }} quest={null} questEvent={null} />
  );
}

function EditedForm({ questId }: { questId: string }): ReactElement {
  const { data: quest, isPending, refetch } = useQuery(questQuery(questId));
  const events = useQuery(globalEventsQuery);
  const announcers = useQuery(globalEventAnnouncersQuery).data ?? [];
  if (quest !== undefined && !events.isPending) {
    const questEvent = eventOfQuest(quest, events.data, announcers);
    return <Form eventId={null} friendId={null} proposal={null} quest={quest} questEvent={questEvent} />;
  }
  return (
    <FullScreenPanel leave={{ kind: 'back', onPress: router.back }} title="모집글 수정">
      {isPending || events.isPending ? <LoadingState /> : <ErrorState onRetry={() => void refetch()} />}
    </FullScreenPanel>
  );
}

const styles = StyleSheet.create({
  body: { gap: space[5], padding: space[4] },
  post: { gap: space[3] },
  section: { marginBottom: space[1], fontFamily: font.bold, fontSize: 13, lineHeight: 18, color: color.inkMuted },
});
