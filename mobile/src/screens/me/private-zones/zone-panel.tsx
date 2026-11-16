/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { UseQueryResult } from '@tanstack/react-query';
import { type ReactElement, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { PrivateZone } from '@/api/private-zone-types';
import {
  Button,
  color,
  EmptyState,
  ErrorState,
  ListRow,
  LoadingState,
  RoundIcon,
  shadow,
  space,
  text,
  useToast,
} from '@/design-system';
import { useInsets } from '@/design-system/insets';
import { usePrivateZoneChanges } from '@/features/private-zones/use-private-zones';
import { FIVE_AT_MOST, type ZoneDrawing } from './use-zone-drawing';

// Removes a zone, its row disabled until the list comes again without it.
function useRemoving(): [ReadonlySet<string>, (id: string) => void] {
  const changes = usePrivateZoneChanges();
  const showToast = useToast();
  const [removing, setRemoving] = useState<ReadonlySet<string>>(new Set());
  const remove = (id: string): void => {
    setRemoving((now) => new Set(now).add(id));
    const settle = (): void => {
      setRemoving((now) => new Set([...now].filter((each) => each !== id)));
    };
    changes.remove(id).then(settle, () => {
      settle();
      showToast('지우지 못했어요');
    });
  };
  return [removing, remove];
}

// One row per zone, a list of items and not of choices: its name and 삭제.
function ZoneRows({ zones }: { zones: UseQueryResult<PrivateZone[]> }): ReactElement {
  const [removing, remove] = useRemoving();
  const { data, isPending, refetch } = zones;
  if (data === undefined) {
    return isPending ? (
      <LoadingState />
    ) : (
      <ErrorState
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }
  if (data.length === 0) {
    return <EmptyState words="아직 그린 곳이 없어요" />;
  }
  return (
    <ScrollView style={styles.rows}>
      {data.map(({ id, label }) => (
        <ListRow
          key={id}
          leading={<RoundIcon fill={color.privateSoft} icon="lock" ink={color.private} />}
          title={label}
          trailing={
            <Button
              disabled={removing.has(id)}
              label={`${label} 삭제`}
              onPress={() => {
                remove(id);
              }}
              variant="secondary"
            >
              삭제
            </Button>
          }
        />
      ))}
    </ScrollView>
  );
}

// The outline drawn and not yet saved: why it cannot be, if so, and 취소 and 저장 side by side.
function Unsaved({ drawing }: { drawing: ZoneDrawing }): ReactElement {
  return (
    <View style={styles.unsaved}>
      {drawing.problem === null ? null : <Text style={styles.problem}>{drawing.problem}</Text>}
      <View style={styles.actions}>
        <View style={styles.action}>
          <Button full onPress={drawing.cancel} variant="secondary">
            취소
          </Button>
        </View>
        <View style={styles.action}>
          <Button disabled={drawing.problem !== null || drawing.saving} full onPress={drawing.save}>
            저장
          </Button>
        </View>
      </View>
    </View>
  );
}

interface ZonePanelProps {
  zones: UseQueryResult<PrivateZone[]>;
  drawing: ZoneDrawing;
}

// Under the map: what the zones do, and the zones, or the outline being drawn.
export function ZonePanel({ zones, drawing }: ZonePanelProps): ReactElement {
  const { bottom } = useInsets();
  return (
    <View style={[styles.panel, { paddingBottom: space[4] + bottom }]}>
      <Text style={styles.line}>칠한 곳 안의 위치는 저장하지 않아요. 친구에게는 시간표만 보여요.</Text>
      {drawing.unsaved === null ? (
        <>
          <ZoneRows zones={zones} />
          <Text style={styles.caption}>{FIVE_AT_MOST}</Text>
        </>
      ) : (
        <Unsaved drawing={drawing} />
      )}
    </View>
  );
}

// About three rows show; more scroll, so that the map keeps its room.
const ROWS_SHOWN = 3.5;
const ROW = 56;

const styles = StyleSheet.create({
  panel: {
    gap: space[2],
    paddingTop: space[4],
    paddingHorizontal: space[4],
    backgroundColor: color.surface,
    boxShadow: shadow.sheet,
  },
  line: { ...text.body, color: color.ink },
  rows: { maxHeight: ROW * ROWS_SHOWN },
  caption: { ...text.caption, color: color.inkMuted },
  unsaved: { gap: space[2] },
  problem: { ...text.caption, color: color.warning },
  actions: { flexDirection: 'row', gap: space[2] },
  action: { flex: 1 },
});
