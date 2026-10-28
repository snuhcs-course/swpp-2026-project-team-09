/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { router } from 'expo-router';
import { type ReactElement, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { TaughtAlias } from '@/api/alias-types';
import {
  color,
  Dialog,
  EmptyState,
  ErrorState,
  FullScreenPanel,
  IconButton,
  type IconName,
  ListRow,
  LoadingState,
  RoundIcon,
  space,
  text,
  useToast,
} from '@/design-system';
import { useTaughtAliases } from '@/features/assistant/use-taught-aliases';
import { koreaCalendar } from '@/korea-time';

export const ALIAS_DELETED = '지웠어요';
export const ALIAS_NOT_DELETED = '지우지 못했어요. 다시 시도해 주세요';

const KIND_ICONS: Record<TaughtAlias['kind'], IconName> = { place: 'pin', friend: 'user', globalEvent: 'calendar' };

function titleOf({ words, target }: TaughtAlias): string {
  return `${words} → ${target.label}`;
}

// "3번 · 10월 26일": how often the words were used, and when last.
function metaOf({ uses, lastUsedAt }: TaughtAlias): string {
  const { month, date } = koreaCalendar(new Date(lastUsedAt));
  return `${uses}번 · ${month}월 ${date}일`;
}

function AliasRow({ alias, onDelete }: { alias: TaughtAlias; onDelete: () => void }): ReactElement {
  return (
    <ListRow
      leading={<RoundIcon fill={color.blue50} icon={KIND_ICONS[alias.kind]} ink={color.snuBlue} />}
      lines={[metaOf(alias)]}
      title={titleOf(alias)}
      trailing={<IconButton icon="trash" label={`${titleOf(alias)} 지우기`} onPress={onDelete} />}
    />
  );
}

// 지우기 of a row, after the danger dialog, with a toast either way.
function useDeletion(remove: (aliasId: string) => Promise<void>): {
  asking: TaughtAlias | null;
  ask: (alias: TaughtAlias | null) => void;
  confirm: () => void;
} {
  const showToast = useToast();
  const [asking, ask] = useState<TaughtAlias | null>(null);
  const confirm = (): void => {
    if (asking !== null) {
      remove(asking.id).then(
        () => {
          showToast(ALIAS_DELETED);
        },
        () => {
          showToast(ALIAS_NOT_DELETED);
        },
      );
    }
    ask(null);
  };
  return { asking, ask, confirm };
}

// 내가 가르친 말, pushed from 내 정보: the words the User taught the Assistant by choosing what they meant, each with
// what it means now, how often and when it was last used, and 지우기. A Friend who is no Friend any more is "친구".
export function TaughtWordsScreen(): ReactElement {
  const { list, remove } = useTaughtAliases();
  const { asking, ask, confirm } = useDeletion(remove);
  const aliases = list.data;
  return (
    <FullScreenPanel count={aliases?.length} leave={{ kind: 'back', onPress: router.back }} title="내가 가르친 말">
      <View style={styles.list}>
        <Text style={styles.note}>채팅에서 고른 뜻을 기억해 두었다가 다음부터 바로 찾아요</Text>
        {aliases === undefined && list.isPending ? <LoadingState /> : null}
        {aliases === undefined && !list.isPending ? (
          <ErrorState
            onRetry={() => {
              void list.refetch();
            }}
          />
        ) : null}
        {aliases?.length === 0 ? <EmptyState words="아직 가르친 말이 없어요" /> : null}
        {(aliases ?? []).map((alias) => (
          <AliasRow
            alias={alias}
            key={alias.id}
            onDelete={() => {
              ask(alias);
            }}
          />
        ))}
      </View>
      <Dialog
        body={asking === null ? undefined : `${titleOf(asking)}. 지우면 다음부터 AI가 다시 물어봐요.`}
        cancelLabel="취소"
        confirmLabel="지우기"
        onCancel={() => {
          ask(null);
        }}
        onConfirm={confirm}
        title="가르친 말을 지울까요?"
        tone="danger"
        visible={asking !== null}
      />
    </FullScreenPanel>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: space[4], paddingBottom: space[8] },
  note: { ...text.caption, paddingTop: space[3], paddingBottom: space[1], color: color.inkMuted },
});
