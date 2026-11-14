/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { type ReactElement, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { interestsQuery, lobbyQuery } from '@/api/queries';
import {
  Button,
  cardStyles,
  Chip,
  color,
  EmptyState,
  ErrorState,
  FullScreenPanel,
  ListRow,
  LoadingState,
  RoundIcon,
  SectionHeader,
  space,
  text,
  useToast,
} from '@/design-system';
import { hashtagChips, type InterestRow, interestRow } from '@/features/interests/adapter';
import { useInterestChanges } from '@/features/interests/use-interests';

export const WATCHED_ONLY = '지켜봐 드리는 것은 행사와 모집뿐이에요';

function Hashtags(): ReactElement {
  const hashtags = useQuery(lobbyQuery).data?.profile.hashtags ?? [];
  return (
    <View style={[cardStyles.card, styles.card]}>
      <SectionHeader>프로필 관심사</SectionHeader>
      {hashtags.length === 0 ? (
        <Text style={styles.note}>프로필에 넣은 관심사가 없어요</Text>
      ) : (
        <View style={styles.chips}>
          {hashtagChips(hashtags).map((hashtag) => (
            <Chip key={hashtag} size="sm">
              {hashtag}
            </Chip>
          ))}
        </View>
      )}
      <Text style={styles.note}>프로필 편집에서 바꿀 수 있어요</Text>
    </View>
  );
}

interface WatchedRowProps {
  row: InterestRow;
  removing: boolean;
  onRemove: () => void;
}

function WatchedRow({ row, removing, onRemove }: WatchedRowProps): ReactElement {
  return (
    <ListRow
      leading={<RoundIcon fill={color.blue50} icon="bell" ink={color.snuBlue} />}
      lines={row.topics === null ? [] : [row.topics]}
      title={row.title}
      trailing={
        <Button disabled={removing} label={`${row.title} 지우기`} onPress={onRemove} variant="secondary">
          지우기
        </Button>
      }
    />
  );
}

// Removes an interest, its row disabled until the list comes again without it.
function useRemoving(): [ReadonlySet<string>, (id: string) => void] {
  const changes = useInterestChanges();
  const showToast = useToast();
  const [removing, setRemoving] = useState<ReadonlySet<string>>(new Set());
  const settle = (id: string): void => {
    setRemoving((now) => new Set([...now].filter((each) => each !== id)));
  };
  const remove = (id: string): void => {
    setRemoving((now) => new Set(now).add(id));
    changes.remove(id).then(
      () => {
        settle(id);
        showToast('관심을 지웠어요');
      },
      () => {
        settle(id);
        showToast('지우지 못했어요');
      },
    );
  };
  return [removing, remove];
}

// A main server that keeps no watched interests yet is a list without any.
function Watched(): ReactElement {
  const { data, isPending, refetch } = useQuery(interestsQuery);
  const [removing, remove] = useRemoving();
  const rows = data === undefined ? undefined : (data ?? []).map((interest) => interestRow(interest));
  return (
    <View style={[cardStyles.card, styles.card]}>
      <SectionHeader>맡겨 둔 관심</SectionHeader>
      <Text style={styles.note}>{WATCHED_ONLY}</Text>
      {rows === undefined && isPending ? <LoadingState /> : null}
      {rows === undefined && !isPending ? (
        <ErrorState
          onRetry={() => {
            void refetch();
          }}
        />
      ) : null}
      {rows?.length === 0 ? <EmptyState words="맡겨 둔 관심이 없어요" /> : null}
      {rows?.map((row) => (
        <WatchedRow
          key={row.id}
          onRemove={() => {
            remove(row.id);
          }}
          removing={removing.has(row.id)}
          row={row}
        />
      ))}
    </View>
  );
}

// 관심사, from 내 정보 (P05 ticket 08): the profile's hashtags, which match without a notification, and the interests
// the User asked to be told about, each with a way to stop it.
export function InterestsScreen(): ReactElement {
  return (
    <FullScreenPanel leave={{ kind: 'back', onPress: router.back }} subtle title="관심사">
      <View style={styles.body}>
        <Hashtags />
        <Watched />
      </View>
    </FullScreenPanel>
  );
}

const styles = StyleSheet.create({
  body: { gap: space[3], padding: space[4] },
  card: { gap: space[2] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  note: { ...text.caption, color: color.inkMuted },
});
