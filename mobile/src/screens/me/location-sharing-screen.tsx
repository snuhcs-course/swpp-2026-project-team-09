/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { friendsQuery } from '@/api/queries';
import type { Friend, FriendLevel } from '@/api/types';
import {
  Avatar,
  cardStyles,
  color,
  EmptyState,
  ErrorState,
  font,
  FullScreenPanel,
  LoadingState,
  SectionHeader,
  space,
  SwitchRow,
  text,
} from '@/design-system';
import { LevelTrack } from '../friends/level-track';
import { OffQuestion } from '../friends/off-question';
import { type Levels, useLevels } from '../friends/use-levels';
import { LocationExplanation } from '../main/location-explanation';
import { MasterOffLine } from './master-off-line';
import { useSharingSwitch } from './use-sharing-switch';

const SEEN_WORDS: Readonly<Record<FriendLevel, string>> = {
  timetable: '서로 시간표만 보여요',
  building: '서로 지금 있는 건물까지 보여요',
  exact: '서로 정확한 위치까지 보여요',
};

const FROM_LEAST: readonly FriendLevel[] = ['timetable', 'building', 'exact'];

// The main server's `seen`, lowered at once by a choice or a switch on its way, and raised only once the main server
// says so: the app does not know the Friend's own end.
function seenNow(seen: FriendLevel, own: FriendLevel, masterOn: boolean): FriendLevel {
  if (!masterOn) {
    return 'timetable';
  }
  return FROM_LEAST.indexOf(own) < FROM_LEAST.indexOf(seen) ? own : seen;
}

interface FriendRowProps {
  friend: Friend;
  level: FriendLevel;
  seen: FriendLevel;
  masterOn: boolean;
  onChoose: (level: FriendLevel) => void;
}

function FriendRow({ friend, level, seen, masterOn, onChoose }: FriendRowProps): ReactElement {
  const line = SEEN_WORDS[seen];
  return (
    <View style={styles.friend}>
      <View accessibilityLabel={`${friend.name}, ${line}`} accessible style={styles.who}>
        <Avatar name={friend.name} />
        <View style={styles.words}>
          <Text numberOfLines={1} style={styles.name}>
            {friend.name}
          </Text>
          <Text numberOfLines={1} style={styles.line}>
            {line}
          </Text>
        </View>
      </View>
      <LevelTrack disabled={!masterOn} label={`${friend.name}님에게 보일 위치`} level={level} onChoose={onChoose} />
    </View>
  );
}

interface PerFriendProps {
  levels: Levels;
  masterOn: boolean;
}

// "친구마다": what the two see of each other, and the User's own end as three cells, shown off and disabled under one
// line while the Master Switch is off.
function PerFriend({ levels, masterOn }: PerFriendProps): ReactElement {
  const { data, isPending, refetch } = useQuery(friendsQuery);
  return (
    <View style={[cardStyles.card, styles.card]}>
      <SectionHeader>친구마다</SectionHeader>
      <MasterOffLine />
      {data === undefined && isPending ? <LoadingState /> : null}
      {data === undefined && !isPending ? (
        <ErrorState
          onRetry={() => {
            void refetch();
          }}
        />
      ) : null}
      {data?.length === 0 ? <EmptyState words="아직 친구가 없어요" /> : null}
      {data?.map((friend) => {
        const level = levels.levelOf(friend);
        return (
          <FriendRow
            friend={friend}
            key={friend.id}
            level={level}
            masterOn={masterOn}
            onChoose={(chosen) => {
              levels.choose(friend, chosen);
            }}
            seen={seenNow(friend.seen, level, masterOn)}
          />
        );
      })}
      <Text style={styles.foot}>시간표의 건물과 끝나는 시각은 친구 모두에게 보여요. 위치를 꺼도 시간표는 보여요.</Text>
      <Text style={styles.foot}>{"새 친구는 '지금 있는 건물'에서 시작해요."}</Text>
    </View>
  );
}

const NEVER_KEPT = [
  { what: '누가 나를 찾았는지', fact: '기록 안 함' },
  { what: '지난 위치', fact: '저장 안 함' },
] as const;

function NeverKept(): ReactElement {
  return (
    <View style={[cardStyles.card, styles.card]}>
      <SectionHeader>남기지 않는 것</SectionHeader>
      {NEVER_KEPT.map(({ what, fact }) => (
        <View accessibilityLabel={`${what} · ${fact}`} accessible key={what} style={styles.kept}>
          <Text style={styles.keptWhat}>{what}</Text>
          <Text style={styles.keptFact}>{fact}</Text>
        </View>
      ))}
      <Text style={styles.foot}>과목과 강의실은 보이지 않고, 후보로 검토된 것은 누구에게도 알리지 않아요.</Text>
    </View>
  );
}

// 위치 공유 (`/me/location-sharing`, board n7b), from "위치 공유 보기": the Master Switch, each Friend's level, and what
// the app never keeps. The switch and the levels ask once, as on 내 정보 and 친구 관리.
export function LocationSharingScreen(): ReactElement {
  const sharing = useSharingSwitch();
  const levels = useLevels();
  return (
    <FullScreenPanel leave={{ kind: 'back', onPress: router.back }} subtle title="위치 공유">
      <View style={styles.body}>
        <View style={[cardStyles.card, styles.switchCard]}>
          <SwitchRow
            description="끄면 친구 모두에게 시간표만 보여요"
            label="위치 공유"
            onValueChange={sharing.change}
            value={sharing.on}
          />
        </View>
        <PerFriend levels={levels} masterOn={sharing.on} />
        <NeverKept />
      </View>
      <LocationExplanation
        blocked={sharing.blocked}
        onAllow={sharing.allow}
        onLater={sharing.later}
        visible={sharing.explaining}
      />
      <OffQuestion name={null} onAnswer={sharing.answerOff} open={sharing.askingOff} />
      <OffQuestion
        name={levels.asked?.friend.name ?? null}
        onAnswer={levels.answer}
        open={levels.asked?.open === true}
      />
    </FullScreenPanel>
  );
}

const styles = StyleSheet.create({
  body: { gap: space[3], padding: space[4] },
  switchCard: { paddingVertical: space[2] },
  card: { gap: space[2] },
  friend: { gap: space[2], paddingBottom: space[3], borderBottomWidth: 1, borderBottomColor: color.border },
  who: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 56 },
  words: { flex: 1, gap: 1 },
  name: { fontFamily: font.semiBold, fontSize: 15, lineHeight: 22, color: color.ink },
  line: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: color.inkMuted },
  kept: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  keptWhat: { flex: 1, ...text.body, color: color.ink },
  keptFact: { ...text.label, color: color.inkMuted },
  foot: { ...text.caption, color: color.inkMuted },
});
