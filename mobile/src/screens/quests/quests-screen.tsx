/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
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
  tutorialTone,
} from '@/design-system';
import { type QuestRowView, toQuestGroups } from '@/features/quests/adapter';
import { useQuestRows } from '@/features/quests/use-quest-rows';
import { questsInList, stepOf } from '@/features/tutorial/rules';
import { useTutorial } from '@/features/tutorial/use-tutorial';
import type { Tutorial } from '@/api/tutorial-types';
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

// The group "새내기 튜토리얼" on top (MainTutorialList): each started quest with "새내기 튜토리얼 · n/N" and its
// 완료 조건. A press closes this screen and opens the quest's sheet on the main screen (`/main?tutorial=…`).
function TutorialGroup({ tutorial }: { tutorial: Tutorial | undefined }): ReactElement | null {
  const quests = questsInList(tutorial);
  if (tutorial === undefined || quests.length === 0) {
    return null;
  }
  return (
    <View>
      <SectionHeader>새내기 튜토리얼</SectionHeader>
      {quests.map((quest) => {
        const kicker = `새내기 튜토리얼 · ${stepOf(tutorial, quest.key)}`;
        const condition = `완료 조건 · ${quest.condition}`;
        return (
          <ListRow
            key={quest.key}
            kicker={{ words: kicker, color: tutorialTone.ink }}
            label={[kicker, quest.title, condition].join(' · ')}
            large
            leading={<RoundIcon fill={tutorialTone.ink} icon="flag" ink={color.onPrimary} />}
            lines={[condition]}
            onPress={() => {
              router.dismissTo({ pathname: '/main', params: { tutorial: quest.key } });
            }}
            title={quest.title}
          />
        );
      })}
    </View>
  );
}

interface GroupsProps {
  rows: readonly QuestRowView[];
  onPress: (row: QuestRowView) => void;
  tutorial: Tutorial | undefined;
}

function Groups({ rows, onPress, tutorial }: GroupsProps): ReactElement {
  if (rows.length === 0 && questsInList(tutorial).length === 0) {
    return <EmptyState words="퀘스트가 없어요" />;
  }
  return (
    <View style={styles.groups}>
      <TutorialGroup tutorial={tutorial} />
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

// The User's Quests on the whole screen, the `MainQuests` frame: the started tutorial quests on top under 전체, then
// every Quest that has not ended, by the day it starts, with chips that filter classes and Parties.
export function QuestsScreen(): ReactElement {
  const { data, isPending, refetch } = useQuestRows();
  const tutorial = useTutorial();
  const tutorialCount = questsInList(tutorial).length;
  const [filter, setFilter] = useState<Filter>('all');
  const quests = data?.filter(({ ended }) => !ended);
  const classes = quests?.filter(({ kind }) => kind === 'class') ?? [];
  const parties = quests?.filter(({ kind }) => kind === 'party') ?? [];
  const shown = { all: quests ?? [], class: classes, party: parties }[filter];
  return (
    <FullScreenPanel
      count={quests === undefined ? undefined : quests.length + tutorialCount}
      leave={{ kind: 'close', onPress: router.back }}
      title="퀘스트"
      under={
        quests === undefined ? null : (
          <ChipRow
            chips={[
              { key: 'all', label: '전체', count: quests.length + tutorialCount },
              { key: 'class', label: '강의', count: classes.length },
              { key: 'party', label: '파티', count: parties.length },
            ]}
            onSelect={setFilter}
            selected={filter}
          />
        )
      }
    >
      {quests === undefined ? null : (
        <Groups onPress={press} rows={shown} tutorial={filter === 'all' ? tutorial : undefined} />
      )}
      {quests === undefined && isPending ? <LoadingState /> : null}
      {quests === undefined && !isPending ? <ErrorState onRetry={refetch} /> : null}
    </FullScreenPanel>
  );
}

const styles = StyleSheet.create({
  groups: { paddingHorizontal: space[5], paddingBottom: space[6] },
  time: { ...text.label, color: color.ink },
});
