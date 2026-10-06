import { useQuery } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { eventRecruitingQuery } from '@/api/queries';
import type { Quest } from '@/api/types';
import { myUserId } from '@/auth/sign-in';
import { now } from '@/clock';
import {
  Badge,
  BottomSheet,
  Button,
  color,
  EmptyState,
  ErrorState,
  font,
  Icon,
  LoadingState,
  space,
  text,
} from '@/design-system';
import { type RecruitRowView, toRecruitRows } from '@/features/events/adapter';

interface RecruitingSheetProps {
  event: { id: string; title: string } | null;
  quests: readonly Quest[];
  onClose: () => void;
  onRow: (row: RecruitRowView) => void;
  onRecruit: (eventId: string) => void;
}

function RowBadge({ badge }: { badge: RecruitRowView['badge'] }): ReactElement {
  return (
    <Badge icon={false} tone={badge.kind === 'leader' ? 'neutral' : 'friend'}>
      {badge.label}
    </Badge>
  );
}

function Row({ row, onPress }: { row: RecruitRowView; onPress: () => void }): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <RowBadge badge={row.badge} />
          <Text style={styles.fill}>{row.fill}</Text>
        </View>
        <Text numberOfLines={1} style={styles.rowTitle}>
          {row.title}
        </Text>
        {row.meta === '' ? null : <Text style={styles.meta}>{row.meta}</Text>}
      </View>
      <Icon color={color.inkFaint} name="chevronRight" size={20} />
    </Pressable>
  );
}

function Rows({
  event,
  quests,
  onRow,
}: Omit<RecruitingSheetProps, 'onClose' | 'onRecruit' | 'event'> & {
  event: { id: string; title: string };
}): ReactElement {
  const recruiting = useQuery(eventRecruitingQuery(event.id));
  if (recruiting.isPending) {
    return <LoadingState />;
  }
  if (recruiting.isError) {
    return <ErrorState onRetry={() => void recruiting.refetch()} />;
  }
  const rows = toRecruitRows(event.id, quests, recruiting.data, myUserId(), now());
  return (
    <>
      <Text accessibilityRole="header" style={styles.count}>
        {`모집 중인 파티 ${rows.length}`}
      </Text>
      {rows.length === 0 ? (
        <EmptyState words="아직 모집 중인 파티가 없어요" />
      ) : (
        <ScrollView style={styles.list}>
          {rows.map((row) => (
            <Row
              key={row.questId}
              onPress={() => {
                onRow(row);
              }}
              row={row}
            />
          ))}
        </ScrollView>
      )}
    </>
  );
}

// The `Events` frame's 파티 찾기/모집: the User's own Quest for the event and the Quests gathering for it, and
// `+ 파티 모집`.
export function RecruitingSheet({ event, quests, onClose, onRow, onRecruit }: RecruitingSheetProps): ReactElement {
  return (
    <BottomSheet label="파티 찾기/모집" onClose={onClose} open={event !== null}>
      {event === null ? null : (
        <View style={styles.body}>
          <Text style={styles.event}>{event.title}</Text>
          <Rows event={event} onRow={onRow} quests={quests} />
          <Button
            full
            icon="plus"
            onPress={() => {
              onRecruit(event.id);
            }}
            size="lg"
          >
            파티 모집
          </Button>
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: space[3], paddingHorizontal: space[5] },
  event: { ...text.caption, color: color.inkMuted },
  count: { ...text.title, fontFamily: font.bold, color: color.ink },
  list: { flexGrow: 0, maxHeight: 360 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: 64,
    paddingVertical: space[3],
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  pressed: { backgroundColor: color.surfaceSubtle },
  rowBody: { flex: 1, gap: 2 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fill: { ...text.caption, fontFamily: font.semiBold, color: color.party },
  rowTitle: { fontFamily: font.semiBold, fontSize: 15, lineHeight: 20, color: color.ink },
  meta: { ...text.caption, color: color.inkMuted },
});
