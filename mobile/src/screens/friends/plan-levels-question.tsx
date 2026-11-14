/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { onAskLevels } from '@/api/plan-asks';
import type { AskLevel } from '@/api/plan-quest-types';
import type { FriendLevel } from '@/api/types';
import { BottomSheet, Button, Chip, color, space, text, useToast } from '@/design-system';
import { useFriendChanges } from '@/features/friends/use-friend-changes';
import { LevelTrack } from './level-track';
import { NOT_CHANGED } from './use-levels';

// What a Friend at each level sees of the User, as the question and its toast say it.
const SEEN: Record<FriendLevel, string> = {
  timetable: '시간표만',
  building: '지금 있는 건물까지',
  exact: '정확한 위치까지',
};

// A Plan has at most seven Friends.
const HOW_MANY = ['', '', '둘', '셋', '넷', '다섯', '여섯', '일곱'];

const names = (asks: readonly AskLevel[]): string => asks.map(({ name }) => name).join(', ');

// "지금은 둘에게 시간표만 보여요.", or, when the levels differ, "지금은 민수에게 시간표만, 지은에게 정확한 위치까지 보여요."
function nowLine(asks: readonly AskLevel[]): string {
  const [first, ...rest] = asks;
  if (first === undefined) {
    return '';
  }
  if (rest.some(({ level }) => level !== first.level)) {
    return `지금은 ${asks.map(({ name, level }) => `${name}에게 ${SEEN[level]}`).join(', ')} 보여요.`;
  }
  const whom = rest.length > 0 ? `${HOW_MANY[asks.length] ?? '모두'}에게 ` : '';
  return `지금은 ${whom}${SEEN[first.level]} 보여요.`;
}

interface Asking {
  // The Friends the reply named, whom the question is recorded for.
  named: readonly AskLevel[];
  // Those whose chips are left, whom a chosen level is set for.
  left: readonly AskLevel[];
  open: boolean;
}

interface SheetProps {
  asking: Asking;
  onRemove: (userId: string) => void;
  // A level chosen, or null for a skip.
  onFinish: (level: FriendLevel | null) => void;
}

// The question in the design's words: a removable chip for each name, and the three levels as cells of one width with
// the current one chosen when every Friend left is at it.
function PlanLevelsSheet({ asking: { named, left, open }, onRemove, onFinish }: SheetProps): ReactElement {
  const skip = (): void => {
    onFinish(null);
  };
  const [first] = left;
  const chosen = left.every(({ level }) => level === first?.level) ? (first?.level ?? null) : null;
  return (
    <BottomSheet label="친구에게 보일 위치" onClose={skip} open={open}>
      <View style={styles.body}>
        <Text style={styles.kicker}>내 파티에 처음 들어왔어요</Text>
        <Text accessibilityRole="header" style={styles.title}>{`${names(left)}에게 평소에 어디까지 보일까요?`}</Text>
        <Text style={styles.words}>{`${nowLine(left)}${named.length > 1 ? ' 뺀 친구는 그대로 둬요.' : ''}`}</Text>
        <View style={styles.chips}>
          {left.map(({ userId, name }) => (
            <Chip
              key={userId}
              onRemove={() => {
                onRemove(userId);
              }}
              selected
            >
              {name}
            </Chip>
          ))}
        </View>
        <LevelTrack label="평소에 보일 위치" level={chosen} onChoose={onFinish} />
        <Button full onPress={skip} variant="ghost">
          넘기기
        </Button>
        <Text style={styles.footer}>넘기면 지금처럼 둬요. 친구에게 알림은 가지 않아요</Text>
      </View>
    </BottomSheet>
  );
}

// After a Plan of the User's became a Quest, asks once how much the Friends it names usually see, whatever screen made
// the Quest: the client tells it what the reply of POST /plans names. A removed Friend stays as they are, and an answer
// and a skip are both recorded. It lives in the overlay host, beside the push sheet.
export function PlanLevelsQuestion(): ReactElement | null {
  const changes = useFriendChanges();
  const showToast = useToast();
  const [asking, setAsking] = useState<Asking | null>(null);
  useEffect(
    () =>
      onAskLevels((named) => {
        setAsking({ named, left: named, open: true });
      }),
    [],
  );
  if (asking === null) {
    return null;
  }
  const finish = (level: FriendLevel | null): void => {
    setAsking({ ...asking, open: false });
    void changes
      .recordAsked(
        asking.named.map(({ userId }) => userId),
        'plan',
      )
      .catch(() => null);
    if (level === null) {
      return;
    }
    const { left } = asking;
    const changing = left.filter((ask) => ask.level !== level).map(({ userId }) => changes.setLevel(userId, level));
    void Promise.all(changing).then(
      () => {
        showToast(`${names(left)}에게 ${SEEN[level]} 보여요`);
      },
      () => {
        showToast(NOT_CHANGED);
      },
    );
  };
  const remove = (userId: string): void => {
    const left = asking.left.filter((ask) => ask.userId !== userId);
    if (left.length === 0) {
      finish(null);
    } else {
      setAsking({ ...asking, left });
    }
  };
  return <PlanLevelsSheet asking={asking} onFinish={finish} onRemove={remove} />;
}

const styles = StyleSheet.create({
  body: { gap: space[3], paddingHorizontal: space[5] },
  kicker: { ...text.caption, color: color.snuBlue },
  title: { ...text.title, color: color.ink },
  words: { ...text.body, color: color.inkMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  footer: { ...text.caption, color: color.inkMuted, textAlign: 'center' },
});
