/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { type ReactElement, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, font, Overlay, space } from '@/design-system';
import { useBackToClose } from '@/hooks/use-back-to-close';

// The help of 파티 활성화 and of 일정, one line each (P06 ticket 19), as the user trimmed it on 2026-11-27.
export const ACTIVATION_HELP = {
  title: '파티 활성화',
  lines: [
    '참여한 멤버끼리만 지도에서 서로의 위치를 봐요',
    '참여하려면 전체 위치 공유가 켜져 있어야 해요',
    '한 번에 한 파티만 참여할 수 있어요',
    '남은 일정이 있어야 켤 수 있어요',
  ],
} as const;

export const PLAN_HELP = {
  title: '일정',
  lines: [
    '일정을 추가·수정·삭제하면 다른 멤버에게 알림이 가요',
    '행사를 골라 만든 일정은 행사를 따라가서 고칠 수 없어요',
  ],
} as const;

interface HelpButtonProps {
  help: { title: string; lines: readonly string[] };
  // 20 beside a button, 18 beside words.
  size: number;
}

// Where the ? stands on the screen, once measured: the bubble opens under it.
interface Anchor {
  x: number;
  bottom: number;
}

// The dark bubble's ground, the frame's tooltip navy.
const BUBBLE = '#151A33';
const GUTTER = space[4];
const ARROW = 8;

// A round outlined ? that opens a dark bubble of help under it, over the screen. A press anywhere closes it, as do
// Android's back button and the edge's swipe.
export function HelpButton({ help, size }: HelpButtonProps): ReactElement {
  const round = useRef<View>(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const close = (): void => {
    setOpen(false);
  };
  useBackToClose(open, close);
  return (
    <>
      <Pressable
        accessibilityLabel={`${help.title} 도움말`}
        accessibilityRole="button"
        hitSlop={space[3]}
        onPress={() => {
          setOpen(true);
          round.current?.measureInWindow((x, y, width, height) => {
            setAnchor({ x: x + width / 2, bottom: y + height });
          });
        }}
        ref={round}
        style={[styles.round, { width: size, height: size }]}
      >
        <Text style={[styles.mark, { fontSize: size * 0.6, lineHeight: size - 4 }]}>?</Text>
      </Pressable>
      {open ? (
        <Overlay>
          <Pressable accessibilityLabel={`${help.title} 도움말 닫기`} onPress={close} style={StyleSheet.absoluteFill}>
            <View style={[styles.bubble, { top: (anchor?.bottom ?? 0) + ARROW }]}>
              <View style={[styles.arrow, { left: (anchor?.x ?? GUTTER * 2) - GUTTER - ARROW }]} />
              <Text style={styles.title}>{help.title}</Text>
              {help.lines.map((line) => (
                <View key={line} style={styles.line}>
                  <Text style={styles.words}>•</Text>
                  <Text style={[styles.words, styles.grow]}>{line}</Text>
                </View>
              ))}
            </View>
          </Pressable>
        </Overlay>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  round: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: color.inkMuted,
    borderRadius: 999,
  },
  mark: { fontFamily: font.bold, color: color.inkMuted, textAlign: 'center' },
  bubble: {
    position: 'absolute',
    left: GUTTER,
    right: GUTTER,
    gap: space[1],
    paddingVertical: 14,
    paddingHorizontal: space[4],
    borderRadius: 12,
    backgroundColor: BUBBLE,
  },
  arrow: {
    position: 'absolute',
    top: -ARROW / 2 - 2,
    width: ARROW * 2,
    height: ARROW * 2,
    borderRadius: 2,
    backgroundColor: BUBBLE,
    transform: [{ rotate: '45deg' }],
  },
  title: { fontFamily: font.bold, fontSize: 14, lineHeight: 20, color: color.onPrimary, marginBottom: 2 },
  line: { flexDirection: 'row', gap: 6 },
  words: { fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: '#E3E6F0' },
  grow: { flex: 1 },
});
