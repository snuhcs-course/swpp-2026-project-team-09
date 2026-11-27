/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-09  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { type ReactElement, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { myPartyQuery } from '@/api/queries';
import { ChipRow, EmptyState, ErrorState, LoadingState, SectionHeader, space } from '@/design-system';
import { filterMine, groupMine, LIVE_GROUP, type MineCardView, type MineFilter } from '@/features/party/mine';
import { useMineCards } from '@/features/party/use-party';
import { type Ask, ConfirmSheet } from '../room/confirm-sheet';
import { type PartyEntry, usePartyEntry } from '../room/use-party-entry';
import { useRoomActions } from '../room/use-room-actions';
import { LiveDot } from './live-dot';
import { MineCard } from './mine-card';
import { showFind } from './use-party-actions';

// Without any 파티, the list says what it is for and leads to 찾기 (HE H7). A filter that hides every one says so.
const EMPTY: Record<MineFilter, string> = {
  all: '여기서는 참여 중인 파티를 볼 수 있어요',
  private: '비공개 파티가 없어요',
  public: '참여 중인 공개 파티가 없어요',
};

function MineEmpty({ filter }: { filter: MineFilter }): ReactElement {
  return (
    <EmptyState
      action={filter === 'all' ? { label: '파티 찾기', onPress: showFind } : undefined}
      icon="users"
      words={EMPTY[filter]}
    />
  );
}

// The strip's `참여` enters through the room's `usePartyEntry`: at once, after asking when the User must leave
// another Party, which it leaves, or after '전체 위치 공유를 켤까요?' while the Master Switch is off.
function useEnter(entry: PartyEntry): (card: MineCardView) => void {
  const myParty = useQuery(myPartyQuery).data ?? null;
  return ({ strip }) => {
    if (strip !== null) {
      entry.join(strip.partyId, strip.title, myParty === null ? null : { title: myParty.title, leads: false });
    }
  };
}

interface EnterSheetsProps {
  ask: Ask | null;
  explanation: ReactElement;
  onClose: () => void;
}

// What comes before entering: the question, and the location explanation before turning 전체 위치 공유 on.
function EnterSheets({ ask, explanation, onClose }: EnterSheetsProps): ReactElement {
  return (
    <>
      <ConfirmSheet ask={ask} label="확인" onClose={onClose} />
      {explanation}
    </>
  );
}

// A group's header; "활성화 중", the User's running 파티, after the red light.
function GroupHeader({ title }: { title: string }): ReactElement {
  if (title !== LIVE_GROUP) {
    return <SectionHeader>{title}</SectionHeader>;
  }
  return (
    <View style={styles.liveHeader}>
      <LiveDot />
      <SectionHeader>{title}</SectionHeader>
    </View>
  );
}

interface MineList {
  chips: ReactElement;
  cards: ReactElement;
  sheet: ReactElement;
}

// 내 파티's parts, for the frame that scrolls them: the chips that stay on top, the cards that scroll, and the sheet
// and the location explanation that come before entering. The 파티 tab shows them, and so does 참여 중인 파티 above the tabs.
export function useMineList(): MineList {
  const { data: cards, isPending, refetch } = useMineCards();
  const [filter, setFilter] = useState<MineFilter>('all');
  const [ask, setAsk] = useState<Ask | null>(null);
  const entry = usePartyEntry(setAsk);
  const enter = useEnter(entry);
  const { declineParty } = useRoomActions();
  const all = cards ?? [];
  const shown = filterMine(all, filter);
  // The chips count, and the empty state minds, the Quests the User holds now, not the past ones.
  const held = (chosen: MineFilter): number => filterMine(all, chosen).filter(({ past }) => !past).length;
  return {
    chips: (
      <ChipRow
        chips={[
          { key: 'all', label: '전체', count: held('all') },
          { key: 'private', label: '비공개', count: held('private') },
          { key: 'public', label: '공개', count: held('public') },
        ]}
        onSelect={setFilter}
        selected={filter}
      />
    ),
    cards: (
      <View style={styles.body}>
        {cards === undefined && isPending ? <LoadingState /> : null}
        {cards === undefined && !isPending ? <ErrorState onRetry={refetch} /> : null}
        {cards !== undefined && held(filter) === 0 ? <MineEmpty filter={filter} /> : null}
        {groupMine(shown).map((group) => (
          <View key={group.title} style={styles.group}>
            <GroupHeader title={group.title} />
            {group.cards.map((card) => (
              <MineCard card={card} key={card.questId} onDecline={declineParty} onEnter={enter} />
            ))}
          </View>
        ))}
      </View>
    ),
    sheet: (
      <EnterSheets
        ask={ask}
        explanation={entry.explanation}
        onClose={() => {
          setAsk(null);
        }}
      />
    ),
  };
}

// 내 파티, the frame's `PartyMine`.
export function MineTab(): ReactElement {
  const { chips, cards, sheet } = useMineList();
  return (
    <>
      {chips}
      <ScrollView>{cards}</ScrollView>
      {sheet}
    </>
  );
}

// A group's last card stands 20 from the next group's header words: this gap and the header's 12 above them.
const styles = StyleSheet.create({
  body: { gap: space[2], paddingHorizontal: space[4], paddingBottom: space[6] },
  group: { gap: space[3] },
  liveHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
