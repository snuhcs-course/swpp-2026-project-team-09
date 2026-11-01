/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { TutorialQuest } from '@/api/tutorial-types';
import { color, font, Icon, radius, space, text } from '@/design-system';
import type { ShownBooking } from '@/features/tutorial/kwanjeong-check';
import type { SheetView } from './use-tutorial-flow';

// The Assistant's bubble at the foot of a quest's sheet (MainTutorialOk and MainTutorialFail): a button quest's
// completionMessage, and the 관정 check: running, a booking found with 확인됨, nothing found, the library not reached.

export const KWANJEONG_CHECKING = '관정도서관 예약 내역을 확인하고 있어요';
export const KWANJEONG_NOT_FOUND = '아직 관정도서관 예약 기록이 없어요.\n예약하고 이용한 뒤 다시 확인해 주세요.';
export const KWANJEONG_FAILED = '도서관 서버에 연결하지 못했어요. 잠시 후 다시 확인해 주세요.';

const BOT = 32;
const BOOK = 32;

// The booking the 관정 check found, with 확인됨.
function Found({ booking }: { booking: ShownBooking }): ReactElement {
  return (
    <View style={styles.found}>
      <View style={styles.book}>
        <Icon color={color.onPrimary} name="book" size={16} />
      </View>
      <View style={styles.foundWords}>
        <Text style={styles.foundTitle}>{booking.title}</Text>
        <Text style={styles.foundWhen}>{booking.when}</Text>
      </View>
      <Text style={styles.checked}>확인됨</Text>
    </View>
  );
}

// What the Assistant's bubble says for the sheet shown: the check running, a booking found with the
// completionMessage, nothing found, the library not reached; nothing before 완료했어요.
function bubbleOf(shown: SheetView, quest: TutorialQuest): ReactElement | null {
  if (shown.mode === 'checking') {
    return (
      <Text style={styles.checking}>
        {`${KWANJEONG_CHECKING} `}
        <Text style={styles.ellipsis}>···</Text>
      </Text>
    );
  }
  if (shown.mode === 'notFound' || shown.mode === 'failed') {
    return <Text style={styles.bubbleWords}>{shown.mode === 'notFound' ? KWANJEONG_NOT_FOUND : KWANJEONG_FAILED}</Text>;
  }
  if (shown.mode === 'message') {
    return (
      <>
        {shown.booking === null ? null : <Found booking={shown.booking} />}
        <Text style={styles.bubbleWords}>{quest.completionMessage}</Text>
      </>
    );
  }
  return null;
}

// The Assistant's bubble under the content.
export function Said({ shown, quest }: { shown: SheetView; quest: TutorialQuest }): ReactElement | null {
  const said = bubbleOf(shown, quest);
  if (said === null) {
    return null;
  }
  return (
    <View style={styles.said}>
      <View style={styles.bot}>
        <Icon color={color.onPrimary} name="chat" size={16} />
      </View>
      <View style={styles.bubble}>{said}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  said: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bot: {
    alignItems: 'center',
    justifyContent: 'center',
    width: BOT,
    height: BOT,
    borderRadius: radius.full,
    backgroundColor: color.snuBlue,
  },
  bubble: {
    flex: 1,
    paddingVertical: space[3],
    paddingHorizontal: 14,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    borderBottomLeftRadius: radius.sm,
    gap: space[2],
    backgroundColor: color.blue50,
  },
  bubbleWords: { ...text.body, color: color.ink },
  checking: { ...text.body, fontFamily: font.medium, color: color.inkMuted },
  ellipsis: { fontFamily: font.bold, letterSpacing: 3 },
  found: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: space[3],
    borderRadius: radius.md,
    backgroundColor: color.surface,
  },
  book: {
    alignItems: 'center',
    justifyContent: 'center',
    width: BOOK,
    height: BOOK,
    borderRadius: 10,
    backgroundColor: color.svcStudy,
  },
  foundWords: { flex: 1 },
  foundTitle: { ...text.label, color: color.ink },
  foundWhen: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: color.inkMuted },
  checked: { fontFamily: font.bold, fontSize: 12, lineHeight: 16, color: color.live },
});
