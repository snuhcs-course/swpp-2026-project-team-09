/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ResolvedBy } from '@/api/assistant-types';
import { color, font, Icon, size, space, text, useToast } from '@/design-system';

export const REJECTION_THANKS = '알려 주셔서 고마워요. 다음부터는 다시 물어볼게요';
export const REJECTION_FAILED = '보내지 못했어요. 잠시 후 다시 시도해 주세요';

const HANGUL_FIRST = 0xac00;
const HANGUL_LAST = 0xd7a3;
const FINALS = 28;
const RIEUL = 8;

function lastSyllable(name: string): number | null {
  for (let index = name.length - 1; index >= 0; index -= 1) {
    const code = name.codePointAt(index) ?? 0;
    if (code >= HANGUL_FIRST && code <= HANGUL_LAST) {
      return code;
    }
  }
  return null;
}

// "학생회관으로", "김하늘로", "학생회관(63동)으로": the particle follows the last syllable's final consonant, and is
// "(으)로" after a name with no Hangul.
function withRo(name: string): string {
  const last = lastSyllable(name);
  if (last === null) {
    return `${name}(으)로`;
  }
  const final = (last - HANGUL_FIRST) % FINALS;
  return `${name}${final === 0 || final === RIEUL ? '로' : '으로'}`;
}

function keyOf({ kind, words, id }: ResolvedBy): string {
  return `${kind}:${id}:${words}`;
}

interface ChatResolvedByProps {
  readings: readonly ResolvedBy[];
  // Tells the main server that the words did not mean that; the line leaves once it did.
  onReject: (reading: ResolvedBy) => Promise<void>;
}

// How the answer read the User's words through an alias, a line for each under it: "학관 → 학생회관으로 찾았어요"
// with 아니에요. A press thanks the User once the main server took it, and says so when it did not.
export function ChatResolvedBy({ readings, onReject }: ChatResolvedByProps): ReactElement | null {
  const showToast = useToast();
  const [sending, setSending] = useState<ReadonlySet<string>>(new Set());
  if (readings.length === 0) {
    return null;
  }
  const settle = (key: string): void => {
    setSending((held) => new Set([...held].filter((sent) => sent !== key)));
  };
  const reject = (reading: ResolvedBy): void => {
    const key = keyOf(reading);
    setSending((held) => new Set(held).add(key));
    onReject(reading).then(
      () => {
        settle(key);
        showToast(REJECTION_THANKS);
      },
      () => {
        settle(key);
        showToast(REJECTION_FAILED);
      },
    );
  };
  return (
    <View style={styles.lines}>
      {readings.map((reading) => {
        const key = keyOf(reading);
        const busy = sending.has(key);
        return (
          <View key={key} style={styles.line} testID="resolved-by">
            <Icon color={color.inkMuted} name="sparkle" size={12} />
            <Text style={styles.words}>{`${reading.words} → ${withRo(reading.label)} 찾았어요`}</Text>
            <Pressable
              accessibilityLabel={`${reading.words} → ${reading.label} 아니에요`}
              accessibilityRole="button"
              accessibilityState={{ disabled: busy }}
              disabled={busy}
              hitSlop={HIT_SLOP}
              onPress={() => {
                reject(reading);
              }}
            >
              <Text style={[styles.reject, busy && styles.busy]}>아니에요</Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

// 아니에요 is a line of caption text; its touch area reaches the design system's minimum.
const VERTICAL_SLOP = (size.touchMin - text.caption.lineHeight) / 2;
const HIT_SLOP = { top: VERTICAL_SLOP, bottom: VERTICAL_SLOP, left: space[2], right: space[2] };

const styles = StyleSheet.create({
  lines: { gap: space[1], marginTop: space[2] },
  line: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  words: { ...text.caption, flexShrink: 1, color: color.inkMuted },
  reject: { ...text.caption, fontFamily: font.semiBold, color: color.blue600 },
  busy: { color: color.inkFaint },
});
