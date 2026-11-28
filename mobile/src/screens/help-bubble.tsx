/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 * 2026-11-28  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { type ReactElement, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, font, Overlay, radius, space } from '@/design-system';
import { useBackToClose } from '@/hooks/use-back-to-close';

// A line of help: words after a bullet, or words after a tag, as the place sheet names the kinds of a place.
export type HelpLine = string | { tag: string; words: string };

// The bubble's title, its lines, and a note under a rule.
export interface Help {
  title: string;
  lines: readonly HelpLine[];
  note?: string;
}

interface HelpButtonProps {
  help: Help;
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
const BUBBLE_WORDS = '#E3E6F0';
const GUTTER = space[4];
const ARROW = 8;

function Line({ line }: { line: HelpLine }): ReactElement {
  if (typeof line === 'string') {
    return (
      <View style={styles.line}>
        <Text style={styles.words}>•</Text>
        <Text style={[styles.words, styles.grow]}>{line}</Text>
      </View>
    );
  }
  return (
    <View style={styles.line}>
      <View style={styles.tag}>
        <Text style={styles.tagWords}>{line.tag}</Text>
      </View>
      <Text style={[styles.words, styles.grow]}>{line.words}</Text>
    </View>
  );
}

// A round outlined ? that opens a dark bubble of help under it, over the screen, the room's and the 파티 form's. A press
// anywhere closes it, as do Android's back button and the edge's swipe.
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
            <View style={[styles.bubble, { top: (anchor?.bottom ?? 0) + ARROW }]} testID="help-bubble">
              <View style={[styles.arrow, { left: (anchor?.x ?? GUTTER * 2) - GUTTER - ARROW }]} />
              <Text style={styles.title}>{help.title}</Text>
              {help.lines.map((line) => (
                <Line key={typeof line === 'string' ? line : line.tag} line={line} />
              ))}
              {help.note === undefined ? null : (
                <>
                  <View style={styles.rule} />
                  <Text style={styles.note}>{help.note}</Text>
                </>
              )}
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
  words: { fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: BUBBLE_WORDS },
  grow: { flex: 1 },
  tag: {
    alignSelf: 'flex-start',
    minWidth: 64,
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.sm,
    backgroundColor: BUBBLE_WORDS,
  },
  tagWords: { fontFamily: font.medium, fontSize: 11, lineHeight: 17, color: BUBBLE },
  rule: { height: 1, marginVertical: space[1], backgroundColor: 'rgba(227, 230, 240, 0.2)' },
  note: { fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: '#A9AEC2' },
});
