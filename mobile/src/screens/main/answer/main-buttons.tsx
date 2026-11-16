/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import type { AnswerOffer } from '@/api/refusal-types';
import { Button } from '@/design-system';
import type { PlanInvitation } from '@/features/assistant/use-plan-invitation';
import { openScreen } from './refusal-reply';

interface MainButtonsProps {
  busy: boolean;
  invitation: PlanInvitation | null;
  offers: readonly AnswerOffer[];
}

// The middle of a Plan's row: "이대로 초대" for a Plan with a Friend, then the answer's offers, each a secondary button
// that opens its screen and fills the middle when there is no "이대로 초대".
export function MainButtons({ busy, invitation, offers }: MainButtonsProps): ReactElement {
  return (
    <>
      {invitation === null ? null : (
        <View style={styles.main}>
          <Button disabled={busy} full onPress={invitation.invite}>
            {invitation.sending ? '보내는 중이에요' : '이대로 초대'}
          </Button>
        </View>
      )}
      {offers.map(({ label, screen }) => (
        <View key={label} style={invitation === null ? styles.main : undefined}>
          <Button
            full
            onPress={() => {
              openScreen(screen);
            }}
            variant="secondary"
          >
            {label}
          </Button>
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  main: { flex: 1 },
});
