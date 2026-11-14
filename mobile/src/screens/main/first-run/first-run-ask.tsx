/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { router } from 'expo-router';
import { type ReactElement, type ReactNode, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Button,
  Chip,
  color,
  font,
  Icon,
  type IconName,
  radius,
  shadow,
  space,
  text,
  tutorialTone,
  useToast,
} from '@/design-system';
import type { FirstRunCard } from '@/features/first-run/rules';
import { useSendInviteLink } from '@/features/friends/use-send-invite-link';
import { useInterestChanges } from '@/features/interests/use-interests';
import { CARD } from '../layout';

// The topics the interests card offers, the wireframe's (AmStart o2). Each chosen one is kept as a watched interest.
export const TOPIC_CHIPS = ['채용', '공연', '동아리 모집', '배드민턴', '스터디', '전시', '축제', '러닝'] as const;

const LATER = '나중에';

interface FrameProps {
  step: number;
  icon: IconName;
  title: string;
  lines: readonly string[];
  // Under the lines: the chips, or a line with its icon.
  more?: ReactNode;
  later: () => void;
  primary: ReactElement;
  foot: string;
  onHeight: (height: number) => void;
}

// One card of the first run at the bottom card's place, as the wireframe draws it (AmStart o1, o2): "시작하기 · n/3",
// its question, why it is asked, "나중에" beside its answer, and a line under them.
function Frame({ step, icon, title, lines, more, later, primary, foot, onHeight }: FrameProps): ReactElement {
  return (
    <View
      onLayout={({ nativeEvent: { layout } }) => {
        onHeight(layout.height);
      }}
      style={styles.card}
      testID="first-run-card"
    >
      <View style={styles.head}>
        <View style={styles.round}>
          <Icon color={color.snuBlue} name={icon} size={22} />
        </View>
        <View style={styles.words}>
          <Text style={styles.step}>{`시작하기 · ${step}/3`}</Text>
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          {lines.map((line) => (
            <Text key={line} style={styles.line}>
              {line}
            </Text>
          ))}
        </View>
      </View>
      {more}
      <View style={styles.buttons}>
        <Button onPress={later} variant="ghost">
          {LATER}
        </Button>
        <View style={styles.primary}>{primary}</View>
      </View>
      <Text style={styles.foot}>{foot}</Text>
    </View>
  );
}

interface AskProps {
  onAnswer: (card: FirstRunCard) => void;
  onHeight: (height: number) => void;
}

// Answered once the User comes back from 시간표 with a Class: the main screen sees it and passes on.
function TimetableAsk({ onAnswer, onHeight }: AskProps): ReactElement {
  return (
    <Frame
      foot="넘기면 수업 없이 답해요. 내 정보에서 언제든 넣어요"
      icon="calendar"
      later={() => {
        onAnswer('timetable');
      }}
      lines={['수업 사이의 빈 시간에 맞춰 짜요']}
      more={
        <View style={styles.note}>
          <Icon color={color.inkMuted} name="users" size={16} />
          <Text style={styles.noteWords}>친구에게는 수업 건물과 끝나는 시각만 보여요</Text>
        </View>
      }
      onHeight={onHeight}
      primary={
        <Button
          full
          onPress={() => {
            router.push('/me/timetable');
          }}
        >
          시간표 넣기
        </Button>
      }
      step={1}
      title="시간표부터 넣어 주세요"
    />
  );
}

// Keeps each chosen topic as a watched interest, and is answered once all are kept.
function useKeepTopics(onAnswer: AskProps['onAnswer']): { keeping: boolean; keepTopics: (topics: string[]) => void } {
  const changes = useInterestChanges();
  const showToast = useToast();
  const [keeping, setKeeping] = useState(false);
  const keepTopics = (topics: string[]): void => {
    setKeeping(true);
    Promise.all(topics.map((topic) => changes.watch(topic))).then(
      () => {
        setKeeping(false);
        onAnswer('interests');
      },
      () => {
        setKeeping(false);
        showToast('관심을 맡기지 못했어요');
      },
    );
  };
  return { keeping, keepTopics };
}

function InterestsAsk({ onAnswer, onHeight }: AskProps): ReactElement {
  const [chosen, setChosen] = useState<readonly string[]>([]);
  const { keeping, keepTopics } = useKeepTopics(onAnswer);
  const toggle = (topic: string): void => {
    setChosen((now) => (now.includes(topic) ? now.filter((each) => each !== topic) : [...now, topic]));
  };
  return (
    <Frame
      foot="맡긴 관심은 내 정보 → 관심사에서 지울 수 있어요"
      icon="bell"
      later={() => {
        onAnswer('interests');
      }}
      lines={['고른 것에 맞는 행사와 모집이 새로 뜨면 알려 드려요']}
      more={
        <View style={styles.chips}>
          {TOPIC_CHIPS.map((topic) => (
            <Chip
              key={topic}
              onPress={() => {
                toggle(topic);
              }}
              selected={chosen.includes(topic)}
            >
              {topic}
            </Chip>
          ))}
        </View>
      }
      onHeight={onHeight}
      primary={
        <Button
          disabled={chosen.length === 0 || keeping}
          full
          onPress={() => {
            keepTopics([...chosen]);
          }}
        >
          {chosen.length === 0 ? '맡기기' : `${chosen.length}개 맡기기`}
        </Button>
      }
      step={2}
      title="무엇에 관심이 있어요?"
    />
  );
}

// Answered once the share sheet opens with the link.
function FriendAsk({ onAnswer, onHeight }: AskProps): ReactElement {
  const send = useSendInviteLink();
  return (
    <Frame
      foot="링크는 한 사람만, 만든 뒤 24시간 동안 쓸 수 있어요"
      icon="users"
      later={() => {
        onAnswer('friend');
      }}
      lines={['친구에게는 먼저 내가 있는 건물이 보여요']}
      onHeight={onHeight}
      primary={
        <Button
          full
          icon="send"
          onPress={() => {
            void send().then((sent) => {
              if (sent) {
                onAnswer('friend');
              }
            });
          }}
        >
          초대 링크 보내기
        </Button>
      }
      step={3}
      title="친구 한 명을 불러 보세요"
    />
  );
}

interface FirstRunAskProps extends AskProps {
  card: FirstRunCard;
}

// The first run's card that waits (P05 ticket 09): the Timetable, the interests, or one Friend.
export function FirstRunAsk({ card, onAnswer, onHeight }: FirstRunAskProps): ReactElement {
  if (card === 'timetable') {
    return <TimetableAsk onAnswer={onAnswer} onHeight={onHeight} />;
  }
  if (card === 'interests') {
    return <InterestsAsk onAnswer={onAnswer} onHeight={onHeight} />;
  }
  return <FriendAsk onAnswer={onAnswer} onHeight={onHeight} />;
}

const ROUND = 48;

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    right: CARD.side,
    bottom: CARD.bottom,
    left: CARD.side,
    gap: space[3],
    padding: space[4],
    borderRadius: radius.lg,
    backgroundColor: color.surface,
    boxShadow: shadow.mapCard,
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3] },
  round: {
    alignItems: 'center',
    justifyContent: 'center',
    width: ROUND,
    height: ROUND,
    borderRadius: radius.md,
    backgroundColor: color.blue50,
  },
  words: { flex: 1, gap: 2 },
  step: { ...text.caption, fontFamily: font.semiBold, color: tutorialTone.words },
  title: { ...text.title, color: color.ink },
  line: { ...text.body, fontSize: 14, lineHeight: 20, color: color.inkMuted },
  note: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  noteWords: { ...text.body, fontSize: 14, lineHeight: 20, flexShrink: 1, color: color.inkMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  buttons: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  primary: { flex: 1 },
  foot: { ...text.caption, color: color.inkMuted },
});
