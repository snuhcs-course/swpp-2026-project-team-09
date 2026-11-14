/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-17  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  cardStyles,
  color,
  EmptyState,
  ErrorState,
  FullScreenPanel,
  Icon,
  ListRow,
  LoadingState,
  noticeTone,
  RoundIcon,
  space,
  text,
  useNotReadyToast,
} from '@/design-system';
import { openAddress } from '@/features/notifications/address';
import { type NoticeKind, type NoticeView, todaysNotices } from '@/features/notifications/adapter';
import { useNotices } from '@/features/notifications/use-notices';

const TONE: Record<NoticeKind, keyof typeof noticeTone> = {
  party: 'navy',
  'friend-request': 'navy',
  invitation: 'invitation',
  'join-requests': 'request',
  accepted: 'invitation',
  declined: 'invitation',
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

function Notice({ notice, onPress }: { notice: NoticeView; onPress: () => void }): ReactElement {
  const { ink, ground } = noticeTone[TONE[notice.kind]];
  return (
    <ListRow
      label={[notice.title, notice.sub, ...(notice.time === null ? [] : [notice.time])].join(' · ')}
      leading={<RoundIcon fill={ground} icon={notice.icon} ink={ink} />}
      lines={[notice.sub]}
      onPress={onPress}
      title={notice.title}
      trailing={
        notice.time === null ? (
          <Icon color={color.inkFaint} name="chevronRight" size={16} />
        ) : (
          <Text style={styles.time}>{notice.time}</Text>
        )
      }
    />
  );
}

function Notices({ notices }: { notices: readonly NoticeView[] }): ReactElement {
  const press = usePress();
  return (
    <View style={[cardStyles.card, styles.card]}>
      {notices.length === 0 ? <EmptyState words="새 알림이 없어요" /> : null}
      {notices.map((notice) => (
        <Notice
          key={notice.key}
          notice={notice}
          onPress={() => {
            press(notice);
          }}
        />
      ))}
    </View>
  );
}

// 알림, the panel of the `Profile` frame: the Notifications the main server keeps, then what waits for the User today,
// from the lists the main server serves. The count is today's rows'.
export function NotificationsScreen(): ReactElement {
  const { data, isPending, refetch } = useNotices();
  const count = todaysNotices(data ?? []).length;
  return (
    <FullScreenPanel
      count={count === 0 ? undefined : count}
      leave={{ kind: 'back', onPress: router.back }}
      subtle
      title="알림"
    >
      <View style={styles.body}>
        {data === undefined ? null : <Notices notices={data} />}
        {data === undefined && isPending ? <LoadingState /> : null}
        {data === undefined && !isPending ? <ErrorState onRetry={refetch} /> : null}
      </View>
    </FullScreenPanel>
  );
}

const styles = StyleSheet.create({
  body: { padding: space[4] },
  card: { paddingVertical: 0 },
  time: { ...text.label, color: color.inkFaint },
});
