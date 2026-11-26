/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { ReactElement } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { CompanionSeeker } from '@/api/quest-parts-types';
import { Avatar, Button, cardStyles, color, font, space } from '@/design-system';
import { useCompanionSeekers } from '@/features/party/use-party';
import { TagBadges } from './quest-photo';
import { useFindActions } from './use-party-actions';

function SeekerCard({ seeker, onAsk }: { seeker: CompanionSeeker; onAsk: () => void }): ReactElement {
  return (
    <View accessibilityLabel={`${seeker.name} · ${seeker.department}`} style={[cardStyles.card, styles.seeker]}>
      <View style={styles.seekerHead}>
        <Avatar name={seeker.name} />
        <View style={styles.seekerWords}>
          <Text style={styles.seekerName}>{seeker.name}</Text>
          <Text style={styles.seekerDepartment}>{seeker.department}</Text>
        </View>
      </View>
      <Text style={styles.want}>{`“${seeker.want}”`}</Text>
      <TagBadges tags={seeker.tags} />
      <Text style={styles.free}>{`겹치는 빈 시간 · ${seeker.freeTogether}`}</Text>
      <Button disabled={seeker.asked} full icon="users" onPress={onAsk} variant="secondary">
        {seeker.asked ? '같이 하자고 했어요' : '같이 하자고 하기'}
      </Button>
    </View>
  );
}

// 같이 할 사람을 찾는 중: the people looking for company, side by side. Nothing when there are none, as in the build that
// asks the main server.
export function Seekers(): ReactElement | null {
  const { data: seekers } = useCompanionSeekers();
  const actions = useFindActions();
  if (seekers === undefined || seekers.length === 0) {
    return null;
  }
  return (
    <View accessibilityLabel="같이 할 사람을 찾는 중" style={styles.section}>
      <Text accessibilityRole="header" style={styles.heading}>
        같이 할 사람을 찾는 중
      </Text>
      <ScrollView contentContainerStyle={styles.seekers} horizontal showsHorizontalScrollIndicator={false}>
        {seekers.map((seeker) => (
          <SeekerCard key={seeker.id} onAsk={() => void actions.askSeeker(seeker)} seeker={seeker} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space[3], marginTop: space[2] },
  heading: { fontFamily: font.semiBold, fontSize: 18, lineHeight: 26, letterSpacing: -0.18, color: color.ink },
  seekers: { gap: space[3] },
  seeker: { width: 240, gap: space[2] },
  seekerHead: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  seekerWords: { flex: 1 },
  seekerName: { fontFamily: font.semiBold, fontSize: 15, lineHeight: 22, color: color.ink },
  seekerDepartment: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: color.inkMuted },
  want: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: color.ink },
  free: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: color.party },
});
