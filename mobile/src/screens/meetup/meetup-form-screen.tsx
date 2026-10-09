/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { router } from 'expo-router';
import { type ReactElement, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { now } from '@/clock';
import { Button, Chip, FullScreenPanel, space, TextField } from '@/design-system';
import {
  EMPTY_MEETUP,
  END_NOT_AFTER_START,
  endNotAfterStart,
  isReady,
  type MeetupDraft,
  pickedOf,
  START_PASSED,
  startPassed,
} from '@/features/meetups/meetup-form';
import { useProposeMeetup } from '@/features/meetups/use-meetups';
import { type PickedPlace, waitForPlace } from '@/features/places/picked-place';
import { PlacePicker } from '../places/place-picker';
import { FieldName, TimeField, WhereField } from './meetup-fields';

interface MeetupFormProps {
  friend: { id: string; name: string };
}

// Opens 장소 선택's map; its choice comes back to `onPlace`.
function openMap(onPlace: (place: PickedPlace) => void): void {
  waitForPlace(onPlace);
  router.push('/place-map');
}

type Change = (changed: Partial<MeetupDraft>) => void;

interface FieldsProps {
  draft: MeetupDraft;
  change: Change;
  friendName: string;
  startLate: boolean;
  onStart: (startsAt: string) => void;
  onList: () => void;
}

// `끝나는 시간`, optional: the sheet opens at the start while it has no time.
function EndField({ draft, change }: { draft: MeetupDraft; change: Change }): ReactElement {
  return (
    <TimeField
      error={endNotAfterStart(draft) ? END_NOT_AFTER_START : null}
      from={draft.startsAt}
      label="끝나는 시간"
      none="선택 안 함"
      onClear={{
        label: '끝나는 시간 빼기',
        onPress: () => {
          change({ endsAt: null });
        },
      }}
      onPick={(endsAt) => {
        change({ endsAt });
      }}
      value={draft.endsAt}
    />
  );
}

function MeetupFields({ draft, change, friendName, startLate, onStart, onList }: FieldsProps): ReactElement {
  return (
    <View style={styles.body}>
      <TextField
        label="제목"
        maxLength={30}
        onChangeText={(title) => {
          change({ title });
        }}
        placeholder="제목"
        value={draft.title}
      />
      <TimeField
        error={startLate ? START_PASSED : null}
        label="언제"
        none="날짜·시간 선택"
        onPick={onStart}
        value={draft.startsAt}
      />
      <EndField change={change} draft={draft} />
      <WhereField
        onList={onList}
        onMap={() => {
          openMap((place) => {
            change({ place });
          });
        }}
        words={draft.place?.words ?? null}
      />
      <View style={styles.who}>
        <FieldName hint="1명에게 요청">친구 초대</FieldName>
        <Chip selected>{friendName}</Chip>
      </View>
    </View>
  );
}

// 장소 선택's list over the form, in its event mode. Its row `지도에서 직접 찍기` opens the map, whose choice also
// closes the list.
function Picker({ draft, change, onClose }: { draft: MeetupDraft; change: Change; onClose: () => void }): ReactElement {
  return (
    <PlacePicker
      mode="event"
      onClose={onClose}
      onMap={() => {
        openMap((place) => {
          change({ place });
          onClose();
        });
      }}
      onPick={(place) => {
        change({ place: pickedOf(place) });
        onClose();
      }}
      picked={draft.place?.placeId ?? null}
    />
  );
}

// Sends the proposal and goes back on success. A start that has passed is said under `언제` instead, and an end not
// after the start sends nothing.
function useSubmit(
  friend: MeetupFormProps['friend'],
  draft: MeetupDraft,
  onLate: () => void,
): { sending: boolean; send: () => void } {
  const { sending, send } = useProposeMeetup(friend);
  return {
    sending,
    send: (): void => {
      if (startPassed(draft, now())) {
        onLate();
      } else if (!endNotAfterStart(draft)) {
        void send(draft).then((sent) => {
          if (sent) {
            router.back();
          }
        });
      }
    },
  };
}

// 파티 만들기 opened from a Friend, the `PartyAppt` frame with the fields a Meetup has: `제목`, `언제`, `끝나는 시간`,
// `어디서` and the one Friend under `친구 초대`. Closing it, or sending, goes back to the map as it was.
export function MeetupFormScreen({ friend }: MeetupFormProps): ReactElement {
  const [draft, setDraft] = useState<MeetupDraft>(EMPTY_MEETUP);
  const [startLate, setStartLate] = useState(false);
  const [picking, setPicking] = useState(false);
  const { sending, send } = useSubmit(friend, draft, () => {
    setStartLate(true);
  });
  const change: Change = (changed) => {
    setDraft((held) => ({ ...held, ...changed }));
  };
  const footer = (
    <Button disabled={!isReady(draft) || sending} full onPress={send} size="lg">
      파티 만들기
    </Button>
  );
  return (
    <View style={styles.screen}>
      <FullScreenPanel footer={footer} leave={{ kind: 'close', onPress: router.back }} subtle title="파티 만들기">
        <MeetupFields
          change={change}
          draft={draft}
          friendName={friend.name}
          onList={() => {
            setPicking(true);
          }}
          onStart={(startsAt) => {
            setStartLate(false);
            change({ startsAt });
          }}
          startLate={startLate}
        />
      </FullScreenPanel>
      {picking ? (
        <Picker
          change={change}
          draft={draft}
          onClose={() => {
            setPicking(false);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { gap: 18, padding: space[4], paddingBottom: space[6] },
  who: { alignItems: 'flex-start', gap: space[2] },
});
