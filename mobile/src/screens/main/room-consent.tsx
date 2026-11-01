/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type ReactElement, useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { apiClient } from '@/api/client';
import { LOBBY_KEY, lobbyQuery } from '@/api/queries';
import { type RoomAsk, ROOM_INBOX_KEY, roomInboxQuery, roomRequests } from '@/api/room-requests';
import type { Profile } from '@/api/types';
import { ConsentedNotice, whenOf } from './room-consented';
import { Button, color, font, radius, shadow, space, text, TextField, useToast } from '@/design-system';

// What the room requests ask of the User on the main screen: each companion's consent, every time, with the
// registered name and 학번 that will be sent; and the one-time notices, such as "파티 구성원이 제안을 거절했습니다". The
// dialog follows the invitation's answers (참여 and 거절), as the wireframes have no frame of its own.

export const RECHECK =
  '도서관에서 이름이나 학번을 확인하지 못했어요. 내 정보의 학적상 이름과 학번이 맞는지 확인해 주세요.';

export function consentTitle(name: string): string {
  return `${name}님의 학번이 필요해요. 제공해도 될까요?`;
}

// Nine digits, with or without the hyphen.
function studentNumberOf(typed: string): string | null {
  const digits = typed.replaceAll('-', '').trim();
  return /^\d{9}$/u.test(digits) ? digits : null;
}

interface AskProps {
  ask: RoomAsk;
  profile: Profile;
  onDone: () => void;
}

interface Answers {
  name: string;
  setName: (name: string) => void;
  number: string;
  setNumber: (number: string) => void;
  typedNumber: string | null;
  missing: boolean;
  busy: boolean;
  failed: string | null;
  consent: () => void;
  decline: () => void;
}

// 제공하고 참여 (or 확인했어요) saves the details to 내 정보 first when the dialog asked for them; 거절 declines.
function useAnswers({ ask, profile, onDone }: AskProps): Answers {
  const queryClient = useQueryClient();
  const missing = profile.studentNumber === null || profile.registeredName === null || ask.recheck;
  const [name, setName] = useState(profile.registeredName ?? profile.name);
  const [number, setNumber] = useState(profile.studentNumber ?? '');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const typedNumber = studentNumberOf(number);
  const consent = async (): Promise<void> => {
    setBusy(true);
    setFailed(null);
    try {
      if (missing && typedNumber !== null) {
        await apiClient.updateProfile({ registeredName: name.trim(), studentNumber: typedNumber });
        void queryClient.invalidateQueries({ queryKey: LOBBY_KEY });
      }
      await roomRequests.consent(ask.requestId);
      onDone();
    } catch {
      setFailed('보내지 못했어요. 다시 해 주세요.');
    } finally {
      setBusy(false);
    }
  };
  const decline = async (): Promise<void> => {
    setBusy(true);
    try {
      await roomRequests.decline(ask.requestId);
    } finally {
      setBusy(false);
      onDone();
    }
  };
  return {
    name,
    setName,
    number,
    setNumber,
    typedNumber,
    missing,
    busy,
    failed,
    consent: () => void consent(),
    decline: () => void decline(),
  };
}

// The registered name and 학번 that will be sent, or the fields that ask for them.
function Details({ answers, profile }: { answers: Answers; profile: Profile }): ReactElement {
  const { missing, name, setName, number, setNumber, typedNumber } = answers;
  if (!missing) {
    return (
      <>
        <Text style={styles.detail}>{`학적상 이름 ${profile.registeredName ?? profile.name}`}</Text>
        <Text style={styles.detail}>{`학번 ${profile.studentNumber ?? ''}`}</Text>
      </>
    );
  }
  return (
    <>
      <TextField label="학적상 이름" onChangeText={setName} value={name} />
      <TextField
        error={number !== '' && typedNumber === null ? '학번 9자리를 적어 주세요' : undefined}
        label="학번"
        onChangeText={setNumber}
        placeholder="2026-12345"
        value={number}
      />
    </>
  );
}

function ConsentDialog(props: AskProps): ReactElement {
  const { ask, profile } = props;
  const answers = useAnswers(props);
  const { busy, failed, missing, typedNumber, name } = answers;
  const canConsent = !busy && name.trim() !== '' && (!missing || typedNumber !== null);
  const booker = ask.requester.name;
  return (
    <Modal onRequestClose={answers.decline} statusBarTranslucent transparent visible>
      <View style={styles.scrim}>
        <View accessibilityViewIsModal style={styles.card} testID="room-consent">
          <Text accessibilityRole="header" style={styles.title}>
            {ask.recheck ? RECHECK : consentTitle(profile.registeredName ?? profile.name)}
          </Text>
          <Text style={styles.body}>
            {`${booker}님이 ${ask.space.name} ${whenOf(ask)} 예약에 함께해요. 학번은 이 예약에만 ${booker}님의 휴대폰으로 보내져요.`}
          </Text>
          <Details answers={answers} profile={profile} />
          {failed === null ? null : <Text style={styles.failed}>{failed}</Text>}
          <View style={styles.actions}>
            <View style={styles.action}>
              <Button disabled={busy} full onPress={answers.decline} variant="secondary">
                거절
              </Button>
            </View>
            <View style={styles.action}>
              <Button disabled={!canConsent} full onPress={answers.consent}>
                {ask.recheck ? '확인했어요' : '제공하고 참여'}
              </Button>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// An ask by its request and whether it asks again, so that an ask after the library's refusal is shown anew.
function keyOf({ requestId, recheck }: RoomAsk): string {
  return `${requestId}:${String(recheck)}`;
}

// Mounted on the main screen: the first request that waits for the User's answer, and each notice once.
export function RoomRequestInbox(): ReactElement | null {
  const queryClient = useQueryClient();
  const inbox = useQuery(roomInboxQuery).data;
  const profile = useQuery(lobbyQuery).data?.profile;
  const show = useToast();
  const [answered, setAnswered] = useState<ReadonlySet<string>>(new Set());
  const notice = inbox?.notices[0];
  useEffect(() => {
    if (notice === undefined) {
      return;
    }
    show(notice.text);
    void roomRequests.seen(notice.id).finally(() => {
      void queryClient.invalidateQueries({ queryKey: ROOM_INBOX_KEY });
    });
  }, [notice, show, queryClient]);
  const ask = inbox?.asks.find((each) => each.consented !== true && !answered.has(keyOf(each)));
  const consented = inbox?.asks.find((each) => each.consented === true);
  if (profile === undefined) {
    return null;
  }
  if (ask === undefined) {
    return consented === undefined ? null : <ConsentedNotice ask={consented} />;
  }
  return (
    <ConsentDialog
      ask={ask}
      key={keyOf(ask)}
      onDone={() => {
        setAnswered(new Set([...answered, keyOf(ask)]));
        void queryClient.invalidateQueries({ queryKey: ROOM_INBOX_KEY });
      }}
      profile={profile}
    />
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space[6], backgroundColor: color.scrim },
  card: {
    alignSelf: 'stretch',
    gap: space[3],
    maxWidth: 360,
    padding: space[5],
    borderRadius: radius.lg,
    backgroundColor: color.surface,
    boxShadow: shadow.float,
  },
  title: { ...text.title, fontFamily: font.bold, color: color.ink },
  body: { ...text.body, color: color.inkMuted },
  detail: { ...text.body, fontFamily: font.semiBold, color: color.ink },
  failed: { ...text.body, color: color.danger },
  actions: { flexDirection: 'row', gap: space[2], marginTop: space[2] },
  action: { flex: 1 },
});
