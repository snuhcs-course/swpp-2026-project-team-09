// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import { useQueries } from '@tanstack/react-query';
import { router } from 'expo-router';
import { type ReactElement, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { globalEventsQuery, matchingRequestsQuery } from '@/api/queries';
import { now } from '@/clock';
import {
  Button,
  cardStyles,
  Chip,
  color,
  Dialog,
  EmptyState,
  ErrorState,
  font,
  FullScreenPanel,
  LoadingState,
  space,
  text,
} from '@/design-system';
import { type MatchingRowView, toMatchingRows } from '@/features/events/adapter';
import { useEventActions } from './use-event-actions';

function leave(): void {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/events');
  }
}

function Request({ row, onWithdraw }: { row: MatchingRowView; onWithdraw: () => void }): ReactElement {
  return (
    <View style={[cardStyles.card, styles.card]} testID={`matching-${row.eventId}`}>
      <View style={styles.top}>
        <View style={styles.pill}>
          <View style={styles.dot} />
          <Text style={styles.pillWords}>매칭 중</Text>
        </View>
        <Text style={styles.ago}>{row.ago}</Text>
      </View>
      <Text accessibilityRole="header" style={styles.title}>
        {row.title}
      </Text>
      {row.when === '' ? null : <Text style={styles.when}>{row.when}</Text>}
      <View style={styles.chips}>
        <Chip size="sm">{`${row.size}명`}</Chip>
      </View>
      <View style={styles.actions}>
        <Button onPress={onWithdraw} variant="danger">
          신청 취소
        </Button>
      </View>
    </View>
  );
}

// The `Events` frame's AI 매칭 신청 list, above the tabs: the User's waiting requests, each withdrawn after a question.
export function MatchingScreen(): ReactElement {
  const [requests, events] = useQueries({ queries: [matchingRequestsQuery, globalEventsQuery] });
  const actions = useEventActions();
  const [withdrawing, setWithdrawing] = useState<string | null>(null);
  const rows = requests.data === undefined ? undefined : toMatchingRows(requests.data, events.data ?? [], now());
  return (
    <FullScreenPanel count={rows?.length ?? 0} leave={{ kind: 'back', onPress: leave }} subtle title="AI 매칭 신청">
      {rows === undefined && requests.isPending ? <LoadingState /> : null}
      {rows === undefined && requests.isError ? <ErrorState onRetry={() => void requests.refetch()} /> : null}
      {rows?.length === 0 ? <EmptyState words="신청한 매칭이 없어요" /> : null}
      {rows === undefined || rows.length === 0 ? null : (
        <View style={styles.list}>
          {rows.map((row) => (
            <Request
              key={row.eventId}
              onWithdraw={() => {
                setWithdrawing(row.eventId);
              }}
              row={row}
            />
          ))}
        </View>
      )}
      <Dialog
        cancelLabel="아니요"
        confirmLabel="신청 취소"
        onCancel={() => {
          setWithdrawing(null);
        }}
        onConfirm={() => {
          if (withdrawing !== null) {
            void actions.withdrawMatching(withdrawing);
          }
          setWithdrawing(null);
        }}
        title="매칭 신청을 취소할까요?"
        tone="danger"
        visible={withdrawing !== null}
      />
    </FullScreenPanel>
  );
}

const styles = StyleSheet.create({
  list: { gap: space[3], padding: space[4] },
  card: { gap: space[2] },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 24,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: color.blue50,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.snuBlue },
  pillWords: { ...text.caption, fontFamily: font.bold, color: color.snuBlue },
  ago: { ...text.caption, color: color.inkFaint },
  title: { fontFamily: font.semiBold, fontSize: 17, lineHeight: 24, color: color.ink },
  when: { ...text.label, fontFamily: font.medium, color: color.inkMuted },
  chips: { flexDirection: 'row', gap: space[2] },
  actions: { flexDirection: 'row', justifyContent: 'flex-end' },
});
