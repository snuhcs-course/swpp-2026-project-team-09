/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-24  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { type ReactElement, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { color, Dialog, text } from '@/design-system';
import { reportError } from '@/telemetry';
import { thisVersionLine } from './version-line';

// The test error's fixed message, which says where it came from.
export const TEST_ERROR_MESSAGE = 'A test error, sent from the build line in 내 정보';

// The build and update the phone runs, at the bottom of 내 정보. A long press asks whether to send a test error, so that
// a released build's crash reports can be checked on a phone without crashing it. The line looks as it did: the way in
// is unmarked, and what it sends is one harmless report.
export function BuildLine(): ReactElement {
  const [asking, setAsking] = useState(false);
  return (
    <>
      <Text
        onLongPress={() => {
          setAsking(true);
        }}
        style={styles.version}
      >
        {thisVersionLine()}
      </Text>
      <Dialog
        cancelLabel="취소"
        confirmLabel="보내기"
        onCancel={() => {
          setAsking(false);
        }}
        onConfirm={() => {
          setAsking(false);
          reportError(new Error(TEST_ERROR_MESSAGE), 'test-error');
        }}
        title="시험 오류를 보낼까요?"
        visible={asking}
      />
    </>
  );
}

const styles = StyleSheet.create({
  version: { ...text.caption, textAlign: 'center', color: color.inkMuted },
});
