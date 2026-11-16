/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { PrivateZone } from '@/api/private-zone-types';
import { privateZonesQuery } from '@/api/queries';
import { cardStyles, color, Icon, ListRow, RoundIcon, space, text } from '@/design-system';

const LINE = '칠한 곳 안에서는 시간표만 보여요';

function countOf(zones: PrivateZone[]): number {
  return zones.length;
}

// The way to the zone screen, with how many zones the User drew once the list has come.
export function PrivateZoneRow(): ReactElement {
  const count = useQuery({ ...privateZonesQuery, select: countOf }).data;
  const words = count === undefined ? null : `${String(count)}곳`;
  return (
    <View style={[cardStyles.card, styles.card]}>
      <ListRow
        label={['비공개 구역', LINE, ...(words === null ? [] : [words])].join(', ')}
        leading={<RoundIcon fill={color.privateSoft} icon="lock" ink={color.private} />}
        lines={[LINE]}
        onPress={() => {
          router.push('/me/private-zones');
        }}
        title="비공개 구역"
        trailing={
          <View style={styles.trailing}>
            {words === null ? null : <Text style={styles.count}>{words}</Text>}
            <Icon color={color.inkMuted} name="chevronRight" size={16} />
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: space[1] },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  count: { ...text.label, color: color.inkMuted },
});
