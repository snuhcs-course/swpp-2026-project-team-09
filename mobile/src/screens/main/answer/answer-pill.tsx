/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-18  Opus 5.5   prompted by TaeHyun79
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, Icon, radius, shadow, space, text } from '@/design-system';
import { turnOf } from '@/features/assistant/turn';
import { ANSWER_PILL, listsTop } from '../layout';
import { CloseButton } from './close-button';
import { questionsOf } from '@/features/assistant/turn-outcome';
import type { ChatSheetControl } from '../chat-sheet';
import { pillIconOf } from './pill-icon';
import { FrameQuestions, NEW_CHAT } from './question-list';

interface AnswerPillProps {
  asked: string;
  icon: 'chat' | 'user' | 'pin';
  // The turns of the conversation on screen, beside what was asked (board 9); none for a building asked about.
  count: number | null;
  onClose: () => void;
  onNew: () => void;
  // Opens or closes the list of questions under the pill (board 16).
  onList: () => void;
  listOpen: boolean;
  keyboardUp: boolean;
}

// While the keyboard is up, a press on the pill beside ✕ only puts the keyboard down, as one on the scrim under the
// frame does; while it is down, it opens the list of questions. ✕ stands deeper, so it keeps its press.
function pressOn(keyboardUp: boolean, onList: () => void): Partial<ViewProps> {
  return {
    onStartShouldSetResponder: () => true,
    onResponderGrant: keyboardUp
      ? () => {
          Keyboard.dismiss();
        }
      : onList,
  };
}

function Count({ count }: { count: number }): ReactElement {
  return (
    <View style={styles.count} testID="answer-pill-count">
      <Text style={styles.countWords}>{count}</Text>
    </View>
  );
}

// What the User asked, on one line, with its icon, the count of the conversation's turns, and ✕, which hides the
// frame; or a building asked about over the answer ("여기면 어때?"), with the pin. "＋ 새 대화" at the top right keeps the
// conversation among the earlier ones and starts a new one (boards 24 to 27).
export function AnswerPill(props: AnswerPillProps): ReactElement {
  const { asked, icon, count, onClose, onNew, onList, listOpen, keyboardUp } = props;
  const { top } = useSafeAreaInsets();
  return (
    <View style={[styles.pillRow, { top: listsTop(top) }]}>
      <View
        {...pressOn(keyboardUp, onList)}
        accessibilityLabel={`${asked}, 물은 것 ${listOpen ? '닫기' : '보기'}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: listOpen }}
        style={styles.pill}
        testID="answer-pill"
      >
        <Icon color={color.ink} name={icon} size={20} testID={`answer-pill-${icon}`} />
        <Text ellipsizeMode="tail" numberOfLines={1} style={styles.asked}>
          {asked}
        </Text>
        {count === null || count < 1 ? null : <Count count={count} />}
        <CloseButton label="답 닫기" onPress={onClose} />
      </View>
      <Pressable
        accessibilityLabel={NEW_CHAT}
        accessibilityRole="button"
        onPress={onNew}
        style={({ pressed }) => [styles.new, pressed && styles.pressed]}
      >
        <Icon color={color.snuBlue} name="plus" size={18} />
        <Text style={styles.newWords}>{NEW_CHAT}</Text>
      </Pressable>
    </View>
  );
}

// Whether the list of questions is open under the pill, and what opens and closes it.
export interface QuestionsOpen {
  open: boolean;
  toggle: () => void;
  close: () => void;
}

interface PillAndListProps {
  control: ChatSheetControl;
  keyboardUp: boolean;
  list: QuestionsOpen;
  onClose: () => void;
  stageHeight: number | null;
}

// The pill, and the list of questions under it while it is open and the keyboard is down. "새 대화" in either puts the
// keyboard down and starts a new conversation, which closes the frame.
export function PillAndList({ control, keyboardUp, list, onClose, stageHeight }: PillAndListProps): ReactElement {
  const { chat } = control;
  const { title } = control.howAbout;
  const startNew = (): void => {
    Keyboard.dismiss();
    chat.startNew();
  };
  return (
    <>
      <AnswerPill
        asked={title ?? turnOf(chat.bubbles)?.asked ?? ''}
        icon={title === null ? pillIconOf(chat.bubbles) : 'pin'}
        count={title === null ? questionsOf(control.said).length : null}
        keyboardUp={keyboardUp}
        listOpen={list.open}
        onClose={onClose}
        onList={list.toggle}
        onNew={startNew}
      />
      {list.open && !keyboardUp ? (
        <FrameQuestions control={control} onDone={list.close} onNew={startNew} stageHeight={stageHeight} />
      ) : null}
    </>
  );
}

const COUNT = 24;

const styles = StyleSheet.create({
  pillRow: {
    position: 'absolute',
    right: ANSWER_PILL.side,
    left: ANSWER_PILL.side,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    pointerEvents: 'box-none',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    gap: space[2],
    height: ANSWER_PILL.height,
    paddingLeft: space[4],
    paddingRight: space[1],
    borderRadius: radius.full,
    backgroundColor: color.surface,
    boxShadow: shadow.float,
  },
  asked: { ...text.label, flexShrink: 1, color: color.ink },
  count: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: COUNT,
    height: COUNT,
    paddingHorizontal: space[1],
    borderRadius: COUNT / 2,
    backgroundColor: color.surfaceSunken,
  },
  countWords: { ...text.label, color: color.snuBlue },
  new: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    height: ANSWER_PILL.height,
    paddingHorizontal: space[4],
    borderRadius: radius.full,
    backgroundColor: color.surface,
    boxShadow: shadow.float,
  },
  newWords: { ...text.label, color: color.snuBlue },
  pressed: { opacity: 0.85 },
});
