/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { WatchedInterest } from '@/api/interest-types';
import { friendsQuery, interestsQuery, questsQuery } from '@/api/queries';
import type { Friend, Quest } from '@/api/types';
import { cardStyles, color, font, Icon, type IconName, ListRow, space, text } from '@/design-system';
import { heldAlone } from '@/features/quests/adapter';

interface ActivityRowProps {
  icon: IconName;
  label: string;
  value: string;
  onPress: () => void;
}

function ActivityRow({ icon, label, value, onPress }: ActivityRowProps): ReactElement {
  return (
    <ListRow
      label={value === '' ? label : `${label} ${value}`}
      leading={<Icon color={color.inkMuted} name={icon} size={20} />}
      onPress={onPress}
      title={label}
      trailing={
        <View style={styles.value}>
          {value === '' ? null : <Text style={styles.valueWords}>{value}</Text>}
          <Icon color={color.inkMuted} name="chevronRight" size={16} />
        </View>
      }
    />
  );
}

function friendCountOf(friends: Friend[]): string {
  return String(friends.length);
}

// The User's Quests that are not Class Quests or taken alone: the frames draw every other Quest as a 파티.
function partyCountOf(quests: Quest[]): string {
  return String(quests.filter((quest) => !quest.classQuest && !heldAlone(quest)).length);
}

// None from a main server that keeps no watched interests yet.
function interestCountOf(interests: WatchedInterest[] | null): string {
  return interests === null ? '' : String(interests.length);
}

// The ways from 내 정보 to the User's Friends, Parties, Quests, and interests.
export function ActivityCard(): ReactElement {
  const friends = useQuery({ ...friendsQuery, select: friendCountOf }).data ?? '';
  const parties = useQuery({ ...questsQuery, select: partyCountOf }).data ?? '';
  const interests = useQuery({ ...interestsQuery, select: interestCountOf }).data ?? '';
  return (
    <View style={[cardStyles.card, styles.activity]}>
      <ActivityRow
        icon="user"
        label="친구 관리"
        onPress={() => {
          router.push('/me/friends');
        }}
        value={friends}
      />
      <ActivityRow
        icon="users"
        label="참여 중인 파티"
        onPress={() => {
          router.push('/me/parties');
        }}
        value={parties}
      />
      <ActivityRow
        icon="flag"
        label="내 퀘스트"
        onPress={() => {
          router.push('/quests');
        }}
        value=""
      />
      <ActivityRow
        icon="bell"
        label="관심사"
        onPress={() => {
          router.push('/me/interests');
        }}
        value={interests}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  activity: { paddingVertical: space[1] },
  value: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  valueWords: { ...text.caption, fontSize: 13, lineHeight: 18, fontFamily: font.semiBold, color: color.inkMuted },
});
