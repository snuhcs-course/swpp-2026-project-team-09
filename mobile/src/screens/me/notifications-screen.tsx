import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
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
  useNotReadyToast,
} from '@/design-system';
import type { NoticeKind, NoticeView } from '@/features/notifications/adapter';
import { useNotices } from '@/features/notifications/use-notices';

const TONE: Record<NoticeKind, keyof typeof noticeTone> = {
  party: 'navy',
  'friend-request': 'navy',
  invitation: 'invitation',
  meetup: 'invitation',
  'join-requests': 'request',
};

// Where a row leads.
function usePress(): (notice: NoticeView) => void {
  const showNotReady = useNotReadyToast();
  return ({ kind, questId }) => {
    if (kind === 'invitation' || kind === 'meetup') {
      router.navigate({ pathname: '/party', params: { tab: 'invites' } });
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
      label={`${notice.title} · ${notice.sub}`}
      leading={<RoundIcon fill={ground} icon={notice.icon} ink={ink} />}
      lines={[notice.sub]}
      onPress={onPress}
      title={notice.title}
      trailing={<Icon color={color.inkFaint} name="chevronRight" size={16} />}
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

// 알림, the panel of the `Profile` frame: what waits for the User, from the lists the main server serves.
export function NotificationsScreen(): ReactElement {
  const { data, isPending, refetch } = useNotices();
  return (
    <FullScreenPanel
      count={data === undefined || data.length === 0 ? undefined : data.length}
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
});
