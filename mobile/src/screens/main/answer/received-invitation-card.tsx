/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AnswerLine } from '@/api/assistant-types';
import type { InvitationCard } from '@/api/invitation-card-types';
import { Button, color, font, radius, space, text } from '@/design-system';
import { withParticle } from '@/features/map/short-name';
import { koreaClock } from '@/korea-time';
import type { Room } from '../layout';
import type { ReceivedInvitation } from '../use-received-invitation';
import { FrameCard } from './answer-frame';
import { AnswerLines } from './answer-lines';
import { CloseButton } from './close-button';
import { QuestSteps } from './quest-steps';

interface ReceivedInvitationCardProps {
  // Null while it is read, or when the read failed.
  card: InvitationCard | null;
  failed: boolean;
  // The phone told a position outside the campus rectangle.
  offCampus: boolean;
  // 수락 or 거절 is on its way.
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onClose: () => void;
  onRetry: () => void;
}

// The main server's words for a phone off campus (main-server `plans/own-way.ts`). The app sends no position from
// there, so the server cannot tell where the User sets out from and answers `unknown` with no line.
const OFF_CAMPUS_LINES: AnswerLine[] = [[{ text: '캠퍼스 밖이라 길은 그리지 못해요.', strong: false }]];

function wayLines({ way }: InvitationCard, offCampus: boolean): readonly AnswerLine[] {
  if (way === null) {
    return [];
  }
  return way.status === 'unknown' && offCampus ? OFF_CAMPUS_LINES : way.lines;
}

// The destination step is the one that starts when everyone is together, at that Place.
function titleOf({ quest, steps, gathering }: InvitationCard): { time: string | null; title: string } {
  if (gathering === null) {
    return { time: null, title: quest.title };
  }
  const at = Date.parse(gathering.startAt);
  const step = steps.find(
    ({ startsAt, place }) =>
      startsAt !== null && Date.parse(startsAt) === at && place?.placeId === gathering.place.placeId,
  );
  return { time: koreaClock(gathering.startAt), title: step?.title ?? quest.title };
}

function Heading({ words, onClose }: { words: string; onClose: () => void }): ReactElement {
  return (
    <View style={styles.heading}>
      <Text style={styles.whose}>{words}</Text>
      <CloseButton label="초대 닫기" onPress={onClose} />
    </View>
  );
}

interface InvitationProps extends ButtonsProps {
  card: InvitationCard;
  offCampus: boolean;
}

function Invitation({ card, offCampus, busy, onAccept, onDecline }: InvitationProps): ReactElement {
  const { time, title } = titleOf(card);
  const holders = card.holders.map((holder) => holder.name).join(', ');
  const lines = wayLines(card, offCampus);
  return (
    <>
      <Text style={styles.title} testID="invitation-title">
        {time === null ? null : <Text style={styles.time}>{`${time} `}</Text>}
        {title}
      </Text>
      {holders === '' ? null : <Text style={styles.with}>{`${withParticle(holders)} 함께`}</Text>}
      {lines.length === 0 ? null : <AnswerLines lines={lines} way />}
      <View style={styles.steps}>
        <QuestSteps steps={card.steps} />
      </View>
      <Buttons busy={busy} onAccept={onAccept} onDecline={onDecline} />
      <Text style={styles.caption}>초대장에는 내 길만 보여요. 다른 사람의 위치는 파티를 켠 뒤에 보여요.</Text>
    </>
  );
}

interface ButtonsProps {
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

function Buttons({ busy, onAccept, onDecline }: ButtonsProps): ReactElement {
  return (
    <View style={styles.buttons}>
      <View style={styles.accept}>
        <Button disabled={busy} full onPress={onAccept}>
          수락
        </Button>
      </View>
      <Button disabled={busy} onPress={onDecline} variant="secondary">
        거절
      </Button>
    </View>
  );
}

// The card of an invitation the User received, nobody having asked: whose it is with ✕, when and where everyone is
// together, who is in so far, the User's own way in the server's words, the Quest's steps, "수락" and "거절", and the
// line that says that only the User's own way is shown.
export function ReceivedInvitationCard(props: ReceivedInvitationCardProps): ReactElement {
  const { card, failed, offCampus, busy, onAccept, onDecline, onClose, onRetry } = props;
  if (card === null) {
    return (
      <View style={styles.card} testID="invitation-card">
        <Heading onClose={onClose} words="파티 초대" />
        {failed ? (
          <>
            <Text style={styles.with}>초대를 불러오지 못했어요</Text>
            <View style={styles.buttons}>
              <Button onPress={onRetry} variant="secondary">
                다시 시도
              </Button>
            </View>
          </>
        ) : (
          <Text style={styles.with}>초대를 불러오는 중이에요</Text>
        )}
      </View>
    );
  }
  return (
    <View style={styles.card} testID="invitation-card">
      <Heading onClose={onClose} words={`${card.quest.leader.name}의 파티 초대`} />
      <Invitation busy={busy} card={card} offCampus={offCampus} onAccept={onAccept} onDecline={onDecline} />
    </View>
  );
}

interface InvitationFrameProps {
  invitation: ReceivedInvitation;
  room: Room;
  onHeight: (height: number) => void;
}

// The card of a received invitation in the answer frame's card, without a pill, the input, or the tab bar under it.
export function InvitationFrame({ invitation, room, onHeight }: InvitationFrameProps): ReactElement {
  const { bottom } = useSafeAreaInsets();
  const { card, failed, offCampus, busy, accept, decline, closeCard, retry } = invitation;
  return (
    <FrameCard
      barRoom={bottom + space[4]}
      onHeight={onHeight}
      stageHeight={room.stage?.height ?? null}
      testID="invitation-frame"
    >
      <ReceivedInvitationCard
        busy={busy}
        card={card}
        failed={failed}
        offCampus={offCampus}
        onAccept={accept}
        onClose={closeCard}
        onDecline={decline}
        onRetry={retry}
      />
    </FrameCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: space[3] },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[2] },
  whose: { ...text.label, flexShrink: 1, color: color.inkMuted },
  title: { ...text.title, fontFamily: font.bold, color: color.ink },
  time: { color: color.snuBlue },
  with: { ...text.body, color: color.inkMuted },
  steps: { padding: space[3], borderRadius: radius.lg, backgroundColor: color.surfaceSunken },
  buttons: { flexDirection: 'row', gap: space[2] },
  accept: { flex: 1 },
  caption: { ...text.caption, color: color.inkMuted },
});
