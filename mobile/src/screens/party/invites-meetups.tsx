// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import type { ReactElement, ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Meetup } from '@/api/waiting-types';
import { now } from '@/clock';
import {
  Avatar,
  Badge,
  Button,
  cardStyles,
  color,
  EmptyState,
  ErrorState,
  font,
  LoadingState,
  space,
} from '@/design-system';
import { meetupMeta, SENT_STATE } from '@/features/meetups/meetup-view';
import { type MeetupAnswers, useMeetupAnswers, useMeetupInvites } from '@/features/meetups/use-meetups';

const SHARING_NOTE = '멤버가 파티를 활성화하면, 수락한 멤버끼리 위치를 공유해요.';

function Head({ name, words, aside }: { name: string; words: string; aside?: ReactElement }): ReactElement {
  return (
    <View style={styles.head}>
      <Avatar name={name} />
      <Text style={styles.headWords}>
        <Text style={styles.headName}>{name}</Text>
        {words}
      </Text>
      {aside}
    </View>
  );
}

function Content({ meetup }: { meetup: Meetup }): ReactElement {
  return (
    <View style={styles.content}>
      <Text style={styles.title}>{meetup.title}</Text>
      <Text style={styles.meta}>{meetupMeta(meetup, now())}</Text>
    </View>
  );
}

// A Meetup proposed to the User, the `PartyInvites` frame's card.
function ReceivedCard({ meetup, answers }: { meetup: Meetup; answers: MeetupAnswers }): ReactElement {
  const busy = answers.busy === meetup.id;
  return (
    <View accessibilityLabel={meetup.title} style={[cardStyles.card, styles.card]}>
      <Head name={meetup.proposer.name} words="님이 비공개 파티에 초대했어요" />
      <Content meetup={meetup} />
      <Text style={styles.note}>{SHARING_NOTE}</Text>
      <View style={styles.buttons}>
        <View style={styles.button}>
          <Button
            disabled={busy}
            full
            onPress={() => {
              answers.decline(meetup);
            }}
            variant="secondary"
          >
            거절
          </Button>
        </View>
        <View style={styles.button}>
          <Button
            disabled={busy}
            full
            onPress={() => {
              answers.accept(meetup);
            }}
          >
            수락
          </Button>
        </View>
      </View>
    </View>
  );
}

// A Meetup the User proposed, with its state, and `초대 취소` while it waits.
function SentCard({ meetup, answers }: { meetup: Meetup; answers: MeetupAnswers }): ReactElement | null {
  if (meetup.state === 'withdrawn') {
    return null;
  }
  const { label, tone } = SENT_STATE[meetup.state];
  return (
    <View accessibilityLabel={meetup.title} style={[cardStyles.card, styles.card]}>
      <Head aside={<Badge tone={tone}>{label}</Badge>} name={meetup.receiver.name} words="님에게 보낸 초대" />
      <Content meetup={meetup} />
      {meetup.state === 'proposed' ? (
        <Button
          disabled={answers.busy === meetup.id}
          full
          onPress={() => {
            answers.withdraw(meetup);
          }}
          variant="secondary"
        >
          초대 취소
        </Button>
      ) : null}
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }): ReactElement {
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        {title}
      </Text>
      {children}
    </View>
  );
}

// The 파티 tab's `초대` from the Meetups on: under `받은 초대` the Quest invitations given as `before`, then the Meetups
// proposed to the User, then those the User sent, which cannot be edited.
export function MeetupInvites({ before, beforeCount }: { before: ReactNode; beforeCount: number }): ReactElement {
  const { data, isPending, refetch } = useMeetupInvites();
  const answers = useMeetupAnswers();
  if (data === undefined) {
    return isPending ? (
      <LoadingState />
    ) : (
      <ErrorState
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }
  const { received, sent } = data;
  const count = beforeCount + received.length;
  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Section title={`받은 초대 · ${count}`}>
        {count === 0 ? <EmptyState icon="users" words="받은 초대가 없어요" /> : null}
        {before}
        {received.map((meetup) => (
          <ReceivedCard answers={answers} key={meetup.id} meetup={meetup} />
        ))}
      </Section>
      {sent.length === 0 ? null : (
        <Section title={`보낸 초대 · ${sent.length}`}>
          <Text style={styles.note}>보낸 초대는 고칠 수 없어요. 바꾸려면 초대를 취소하고 다시 보내 주세요.</Text>
          {sent.map((meetup) => (
            <SentCard answers={answers} key={meetup.id} meetup={meetup} />
          ))}
        </Section>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { gap: space[6], padding: space[4], paddingBottom: space[6] },
  section: { gap: space[3] },
  sectionTitle: { fontFamily: font.semiBold, fontSize: 12, lineHeight: 16, color: color.inkMuted },
  card: { gap: space[3] },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headWords: { flex: 1, fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: color.inkMuted },
  headName: { fontFamily: font.semiBold, color: color.ink },
  content: { gap: space[1] },
  title: { fontFamily: font.semiBold, fontSize: 18, lineHeight: 26, color: color.ink },
  meta: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: color.inkMuted },
  note: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: color.inkMuted },
  buttons: { flexDirection: 'row', gap: space[2] },
  button: { flex: 1 },
});
