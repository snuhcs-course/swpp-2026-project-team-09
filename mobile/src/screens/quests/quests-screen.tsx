/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { router } from 'expo-router';
import { type ReactElement, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  ChipRow,
  color,
  EmptyState,
  ErrorState,
  FullScreenPanel,
  ListRow,
  LoadingState,
  questTone,
  RoundIcon,
  SectionHeader,
  space,
  text,
} from '@/design-system';
import { type QuestRowView, toQuestGroups } from '@/features/quests/adapter';
import { useQuestRows } from '@/features/quests/use-quest-rows';
import { now } from '@/clock';

type Filter = 'all' | 'class' | 'party';

function QuestRow({ row, onPress }: { row: QuestRowView; onPress: () => void }): ReactElement {
  const tint = questTone[row.tone];
  return (
    <ListRow
      kicker={{ words: row.label, color: tint }}
      label={[row.label, row.title, row.place, row.time].filter((part) => part !== '').join(' · ')}
      large
      leading={<RoundIcon fill={tint} icon={row.icon} ink={color.onPrimary} />}
      lines={row.place === '' ? [] : [row.place]}
      onPress={onPress}
      title={row.title}
      trailing={row.time === '' ? null : <Text style={styles.time}>{row.time}</Text>}
    />
  );
}

// What a press on a row does. A class's row closes this screen and brings the map to the class's place, by the main
// screen's address (`/main?quest=…`), as its row on the map does. Any other row opens the Quest's room above it.
function press(row: QuestRowView): void {
  if (row.kind === 'class') {
    router.dismissTo({ pathname: '/main', params: { quest: row.id } });
  } else {
    router.push(`/room/${row.id}`);
  }
}

interface GroupsProps {
  rows: readonly QuestRowView[];
  onPress: (row: QuestRowView) => void;
}

function Groups({ rows, onPress }: GroupsProps): ReactElement {
  if (rows.length === 0) {
    return <EmptyState words="퀘스트가 없어요" />;
  }
  return (
    <View style={styles.groups}>
      {toQuestGroups(rows, now()).map((group) => (
        <View key={group.title}>
          <SectionHeader>{group.title}</SectionHeader>
          {group.rows.map((row) => (
            <QuestRow
              key={row.id}
              onPress={() => {
                onPress(row);
              }}
              row={row}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

// The User's Quests on the whole screen, the `MainQuests` frame: every Quest that has not ended, by the day it
// starts, with chips that filter classes and Parties.
export function QuestsScreen(): ReactElement {
  const { data, isPending, refetch } = useQuestRows();
  const [filter, setFilter] = useState<Filter>('all');
  const quests = data?.filter(({ ended }) => !ended);
  const classes = quests?.filter(({ kind }) => kind === 'class') ?? [];
  const parties = quests?.filter(({ kind }) => kind === 'party') ?? [];
  const shown = { all: quests ?? [], class: classes, party: parties }[filter];
  return (
    <FullScreenPanel
      count={quests?.length}
      leave={{ kind: 'close', onPress: router.back }}
      title="퀘스트"
      under={
        quests === undefined ? null : (
          <ChipRow
            chips={[
              { key: 'all', label: '전체', count: quests.length },
              { key: 'class', label: '강의', count: classes.length },
              { key: 'party', label: '파티', count: parties.length },
            ]}
            onSelect={setFilter}
            selected={filter}
          />
        )
      }
    >
      {quests === undefined ? null : <Groups onPress={press} rows={shown} />}
      {quests === undefined && isPending ? <LoadingState /> : null}
      {quests === undefined && !isPending ? <ErrorState onRetry={refetch} /> : null}
    </FullScreenPanel>
  );
}

const styles = StyleSheet.create({
  groups: { paddingHorizontal: space[5], paddingBottom: space[6] },
  time: { ...text.label, color: color.ink },
});
