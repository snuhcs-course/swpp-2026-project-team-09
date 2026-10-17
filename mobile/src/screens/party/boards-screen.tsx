/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { router } from 'expo-router';
import { type ReactElement, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { OfficialRecruiting } from '@/api/quest-parts-types';
import {
  color,
  ErrorState,
  font,
  FullScreenPanel,
  Icon,
  LoadingState,
  radius,
  RoundIcon,
  SegmentedTabs,
  space,
} from '@/design-system';
import { BOARDS } from '@/features/party/boards';
import { useBoardRows, useOfficialRecruiting } from '@/features/party/use-party';
import { JoinSheet, officialSubject } from './join-sheet';
import { useFindActions } from './use-party-actions';

export type BoardsTab = 'official' | 'normal';

// `일반`: the four boards, each with its count of posts and `N` when a post was made today.
function Boards(): ReactElement {
  const { data: rows, isPending, refetch } = useBoardRows();
  return (
    <>
      {rows === undefined && isPending ? <LoadingState /> : null}
      {rows === undefined && !isPending ? <ErrorState onRetry={refetch} /> : null}
      {rows === undefined ? null : (
        <View accessibilityLabel="게시판" style={styles.list}>
          {rows.map(({ board, name, count, fresh }) => (
            <Pressable
              accessibilityLabel={`${name} · 모집글 ${String(count)}개`}
              accessibilityRole="button"
              key={board}
              onPress={() => {
                router.push(`/boards/${board}`);
              }}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <RoundIcon
                fill={color.blue50}
                icon={BOARDS.find(({ key }) => key === board)?.icon ?? 'info'}
                ink={color.snuBlue}
              />
              <Text style={styles.name}>{name}</Text>
              {fresh ? (
                <View style={styles.fresh}>
                  <Text style={styles.freshWords}>N</Text>
                </View>
              ) : null}
              <Text style={styles.count}>{count}</Text>
              <Icon color={color.inkSubtle} name="chevronRight" size={18} />
            </Pressable>
          ))}
        </View>
      )}
    </>
  );
}

// `공식`: official recruiting with its fill. A press opens the join sheet.
function Official({
  recruiting,
  onOpen,
}: {
  recruiting: readonly OfficialRecruiting[];
  onOpen: (recruiting: OfficialRecruiting) => void;
}): ReactElement {
  return (
    <View accessibilityLabel="공식 모집" style={styles.officialList}>
      {recruiting.map((one) => {
        const title = one.title.replaceAll('\n', ' ');
        return (
          <Pressable
            accessibilityLabel={title}
            accessibilityRole="button"
            key={one.id}
            onPress={() => {
              onOpen(one);
            }}
            style={({ pressed }) => [styles.official, pressed && styles.pressed]}
          >
            <View style={styles.officialTop}>
              <View style={styles.officialMark}>
                <Text style={styles.officialMarkWords}>공식</Text>
              </View>
              <Text style={styles.officialFill}>{one.joined ? '참여 중' : one.fill}</Text>
            </View>
            <Text style={styles.officialTitle}>{title}</Text>
            <Text numberOfLines={1} style={styles.officialMeta}>{`${one.time} · ${one.place}`}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// 전체 파티: `공식`, official recruiting, and `일반`, the boards. The build that asks the main server has no official
// recruiting, so it shows the boards without the tabs.
export function BoardsScreen({ initialTab = 'normal' }: { initialTab?: BoardsTab }): ReactElement {
  const official = useOfficialRecruiting().data ?? [];
  const actions = useFindActions();
  const [tab, setTab] = useState<BoardsTab>(initialTab);
  const [joining, setJoining] = useState<OfficialRecruiting | null>(null);
  const tabbed = official.length > 0;
  return (
    <FullScreenPanel
      leave={{ kind: 'back', onPress: router.back }}
      subtle
      title="전체 파티"
      under={
        tabbed ? (
          <SegmentedTabs
            onSelect={setTab}
            segments={[
              { key: 'official', label: '공식' },
              { key: 'normal', label: '일반' },
            ]}
            selected={tab}
          />
        ) : undefined
      }
    >
      {tabbed && tab === 'official' ? <Official onOpen={setJoining} recruiting={official} /> : <Boards />}
      <JoinSheet
        onClose={() => {
          setJoining(null);
        }}
        onJoin={() => {
          if (joining !== null) {
            void actions.joinOfficial(joining);
          }
        }}
        post={joining === null ? null : officialSubject(joining)}
      />
    </FullScreenPanel>
  );
}

const MARK = 18;

const styles = StyleSheet.create({
  list: {
    marginTop: space[3],
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: 64,
    paddingHorizontal: space[4],
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  pressed: { backgroundColor: color.surfaceSubtle },
  name: { flex: 1, fontFamily: font.semiBold, fontSize: 16, lineHeight: 22, color: color.ink },
  fresh: {
    alignItems: 'center',
    justifyContent: 'center',
    width: MARK,
    height: MARK,
    borderRadius: radius.full,
    backgroundColor: color.danger,
  },
  freshWords: { fontFamily: font.bold, fontSize: 10, lineHeight: 12, color: color.onPrimary },
  count: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: color.inkMuted },
  officialList: { gap: space[3], padding: space[4] },
  official: {
    gap: 6,
    padding: space[4],
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
  },
  officialTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  officialMark: { height: 22, paddingHorizontal: space[2], borderRadius: radius.full, backgroundColor: color.blue50 },
  officialMarkWords: { fontFamily: font.bold, fontSize: 11, lineHeight: 22, color: color.snuBlue },
  officialFill: { marginLeft: 'auto', fontFamily: font.semiBold, fontSize: 12, lineHeight: 16, color: color.party },
  officialTitle: { fontFamily: font.semiBold, fontSize: 16, lineHeight: 22, color: color.ink },
  officialMeta: { fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: color.inkMuted },
});
