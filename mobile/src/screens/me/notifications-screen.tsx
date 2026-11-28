/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-17  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-19  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 * 2026-11-29  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { router } from 'expo-router';
import { type ReactElement, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Button,
  cardStyles,
  Dialog,
  color,
  EmptyState,
  ErrorState,
  FullScreenPanel,
  Icon,
  ListRow,
  LoadingState,
  noticeTone,
  RoundIcon,
  RowCard,
  SectionHeader,
  space,
  text,
  useNotReadyToast,
} from '@/design-system';
import { openAddress } from '@/features/notifications/address';
import { now } from '@/clock';
import { type NoticeKind, type NoticeView, noticeDays, waitingNotices } from '@/features/notifications/adapter';
import {
  useDeleteAllNotices,
  useDeleteNotice,
  useMarkShownRead,
  useNotices,
} from '@/features/notifications/use-notices';
import { PartyOnButton } from './party-on-button';
import { SwipedNotice } from './swiped-notice';

const TONE: Record<NoticeKind, keyof typeof noticeTone> = {
  party: 'navy',
  'friend-request': 'navy',
  invitation: 'invitation',
  'join-requests': 'request',
  accepted: 'invitation',
  declined: 'invitation',
  'join-accepted': 'invitation',
  'join-declined': 'muted',
  'join-asked': 'request',
  'party-ended': 'muted',
  'party-removed': 'muted',
  'join-cancelled': 'muted',
  'invitation-cancelled': 'muted',
  'became-leader': 'navy',
  'party-activated': 'navy',
  'leave-by': 'navy',
  'room-declined': 'invitation',
  'room-agreed': 'invitation',
  'room-ending': 'navy',
  'room-window': 'request',
  'interest-new': 'navy',
  'step-changed': 'invitation',
  arrived: 'navy',
  late: 'request',
  notice: 'invitation',
};

// Where a row leads.
function usePress(): (notice: NoticeView) => void {
  const showNotReady = useNotReadyToast();
  return ({ kind, questId, address }) => {
    if (address !== null) {
      openAddress(address);
    } else if (kind === 'friend-request') {
      router.push('/me/friends/requests');
    } else if (questId === null) {
      showNotReady();
    } else {
      router.push(`/room/${questId}`);
    }
  };
}

interface NoticeProps {
  notice: NoticeView;
  // Unread when 알림 showed it: a small red dot before its time, and "새 알림" first in its label.
  fresh: boolean;
  onPress: () => void;
  trailing?: ReactElement | undefined;
}

function Notice({ notice, fresh, onPress, trailing }: NoticeProps): ReactElement {
  const { ink, ground } = noticeTone[TONE[notice.kind]];
  const words = [notice.title, notice.sub, ...(notice.time === null ? [] : [notice.time])];
  return (
    <ListRow
      label={[...(fresh ? ['새 알림'] : []), ...words].join(' · ')}
      leading={<RoundIcon fill={ground} icon={notice.icon} ink={ink} />}
      lines={[notice.sub]}
      onPress={onPress}
      title={notice.title}
      trailing={
        trailing ??
        (notice.time === null ? (
          <Icon color={color.inkFaint} name="chevronRight" size={16} />
        ) : (
          <View style={styles.aside}>
            <View style={styles.timeLine}>
              {fresh ? <View style={styles.dot} /> : null}
              <Text style={styles.time}>{notice.time}</Text>
            </View>
            {notice.kind === 'leave-by' && notice.questId !== null ? <PartyOnButton questId={notice.questId} /> : null}
          </View>
        ))
      }
    />
  );
}

// A row of 알림, also on 오늘 (A04 ticket 10). A kept Notification's swipes to the left to be deleted; a row of what
// waits does not. `trailing` takes the place of its time, as 오늘's 거절 and 수락 of an invitation do.
export function NoticeRow({
  notice,
  fresh,
  trailing,
}: {
  notice: NoticeView;
  fresh: boolean;
  trailing?: ReactElement;
}): ReactElement {
  const press = usePress();
  const deleteNotice = useDeleteNotice();
  const row = (
    <Notice
      fresh={fresh}
      notice={notice}
      onPress={() => {
        press(notice);
      }}
      trailing={trailing}
    />
  );
  const { keptId } = notice;
  if (keptId === null) {
    return row;
  }
  return (
    <SwipedNotice
      onDelete={() => {
        deleteNotice(keptId);
      }}
    >
      {row}
    </SwipedNotice>
  );
}

// The rows under 오늘, 어제 and 이전, each group in its own card. `fresh` holds the keys of the rows marked new.
function Notices({ notices, fresh }: { notices: readonly NoticeView[]; fresh: ReadonlySet<string> }): ReactElement {
  if (notices.length === 0) {
    return (
      <View style={[cardStyles.card, styles.card]}>
        <EmptyState words="새 알림이 없어요" />
      </View>
    );
  }
  return (
    <View style={styles.days}>
      {noticeDays(notices, now()).map((day) => (
        <View key={day.title}>
          <SectionHeader>{day.title}</SectionHeader>
          <RowCard>
            {day.notices.map((notice) => (
              <NoticeRow fresh={fresh.has(notice.key)} key={notice.key} notice={notice} />
            ))}
          </RowCard>
        </View>
      ))}
    </View>
  );
}

// The app bar's 모두 지우기, while 알림 shows `count` kept Notifications. It asks once, since nothing brings them back,
// and leaves what waits.
function DeleteAll({ count }: { count: number }): ReactElement | null {
  const deleteAll = useDeleteAllNotices();
  const [asking, setAsking] = useState(false);
  if (count === 0) {
    return null;
  }
  return (
    <>
      <Button
        centred
        onPress={() => {
          setAsking(true);
        }}
        variant="ghost"
      >
        모두 지우기
      </Button>
      <Dialog
        cancelLabel="취소"
        confirmLabel="지우기"
        onCancel={() => {
          setAsking(false);
        }}
        onConfirm={() => {
          setAsking(false);
          deleteAll();
        }}
        title={`알림 ${count}개를 지울까요?`}
        tone="danger"
        visible={asking}
      />
    </>
  );
}

// 알림, above the tabs, which 오늘's "알림 모두 보기" opens (A04 ticket 10): the Notifications the main server keeps,
// then what waits for the User, from the lists the main server serves. The count is of the rows that wait. The kept
// ones shown are then read, and those that were unread stay marked new while 알림 is open.
export function NotificationsScreen(): ReactElement {
  const { data, isPending, refetch } = useNotices();
  const fresh = useMarkShownRead(data !== undefined);
  const count = waitingNotices(data ?? []).length;
  const kept = (data ?? []).filter(({ keptId }) => keptId !== null).length;
  return (
    <FullScreenPanel
      actions={<DeleteAll count={kept} />}
      count={count === 0 ? undefined : count}
      leave={{ kind: 'back', onPress: router.back }}
      subtle
      title="알림"
    >
      <View style={styles.body}>
        {data === undefined ? null : <Notices fresh={fresh} notices={data} />}
        {data === undefined && isPending ? <LoadingState /> : null}
        {data === undefined && !isPending ? <ErrorState onRetry={refetch} /> : null}
      </View>
    </FullScreenPanel>
  );
}

const styles = StyleSheet.create({
  body: { padding: space[4] },
  card: { paddingVertical: 0 },
  days: { gap: space[2] },
  aside: { alignItems: 'flex-end', gap: space[1], paddingVertical: space[2] },
  timeLine: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.danger },
  time: { ...text.label, color: color.inkFaint },
});
