/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, type ReactNode, useState } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import type { AnswerReply, Plan } from '@/api/assistant-types';
import { color, radius, shadow, space, text } from '@/design-system';
import { peopleOf } from '@/features/assistant/plan-input';
import type { OpenedMark } from './opened-mark';

const WIDTH = 280;
const EDGE = space[4];
// Clear of the mark's dot and its label, which stands above or below it.
const LABEL_ROOM = 64;
// A Quest made from a Plan holds at least this many, as the main server makes it (`CAPACITY_MIN`).
const LEAST_CAPACITY = 4;

interface MarkCardProps {
  mark: OpenedMark;
  stage: { width: number; height: number };
  onClose: () => void;
  // As wide as its content, beside the mark's point: a face's card.
  beside?: boolean;
  children: ReactNode;
}

// A card beside a face, clear of its symbol, and inside the stage.
const BESIDE_GAP = 28;
const BESIDE_MAX = 220;

// At the right, unless it does not fit there, or the pick's flag (`clear`) stands where it would and the left has room
// (P04 ticket 14, item 2).
export function besidePlace(
  at: OpenedMark['at'],
  size: { width: number; height: number },
  stage: MarkCardProps['stage'],
  clear: OpenedMark['at'] | null = null,
): { left: number; top: number } {
  const right = at.x + BESIDE_GAP;
  const leftSide = at.x - BESIDE_GAP - size.width;
  const top = Math.min(Math.max(EDGE, at.y - size.height / 2), stage.height - size.height - EDGE);
  const covers =
    clear !== null &&
    clear.x >= right &&
    clear.x <= right + size.width &&
    clear.y >= top - LABEL_ROOM / 2 &&
    clear.y <= top + size.height + LABEL_ROOM / 2;
  const fitsRight = right + size.width + EDGE <= stage.width;
  const left = fitsRight && !(covers && leftSide >= EDGE) ? right : Math.max(EDGE, leftSide);
  return { left, top };
}

// A card attached to a mark of the answer, under its point, or over it when the stage's lower half would cut it; a
// press anywhere else closes it, so the map takes no gesture while it is open.
export function MarkCard({ mark, stage, onClose, beside = false, children }: MarkCardProps): ReactElement {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const { height } = size;
  const below = mark.at.y + LABEL_ROOM;
  const fits = below + height <= stage.height / 2 + LABEL_ROOM;
  const place = beside
    ? besidePlace(mark.at, size, stage, mark.clear ?? null)
    : {
        left: Math.min(Math.max(mark.at.x - WIDTH / 2, EDGE), stage.width - WIDTH - EDGE),
        top: fits ? below : Math.max(EDGE, mark.at.y - LABEL_ROOM - height),
      };
  return (
    <>
      <Pressable
        accessibilityLabel="카드 닫기"
        accessibilityRole="button"
        onPress={onClose}
        style={styles.away}
        testID="mark-card-away"
      />
      <View
        onLayout={({ nativeEvent }: LayoutChangeEvent) => {
          setSize({ width: nativeEvent.layout.width, height: nativeEvent.layout.height });
        }}
        style={[styles.card, beside ? styles.beside : styles.wide, place]}
        testID="mark-card"
      >
        {children}
      </View>
    </>
  );
}

function Row({ name, value }: { name: string; value: string }): ReactElement {
  return (
    <View style={styles.row}>
      <Text style={styles.name}>{name}</Text>
      <Text numberOfLines={2} style={styles.value}>
        {value}
      </Text>
    </View>
  );
}

// The pick's card of a Plan: what "이대로 초대" makes of it with a Friend, its title, 비공개 for a meal's or a meet's
// Quest and 공개 for a new recruiting one, its size and who is invited; alone, its title. Then its basis.
export function PlanFlagRows({ answer, plan }: { answer: AnswerReply; plan: Plan }): ReactElement {
  const together = peopleOf(answer.input).length > 1;
  const invited = plan.parts.filter(({ me }) => !me).map(({ name }) => name);
  const open = answer.input.kind === 'new-quest';
  return (
    <View style={styles.rows}>
      <Row name="제목" value={plan.title} />
      {together || open ? <Row name="공개 범위" value={open ? '공개' : '비공개'} /> : null}
      {together ? <Row name="정원" value={`${String(Math.max(LEAST_CAPACITY, plan.parts.length))}명`} /> : null}
      {invited.length > 0 ? <Row name="초대" value={invited.join(', ')} /> : null}
      {plan.basis.length > 0 ? (
        <View style={styles.basis}>
          {plan.basis.map((line) => (
            <Text key={line} style={styles.basisLine}>
              {line}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  away: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  card: {
    position: 'absolute',
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: color.snuBlue,
    backgroundColor: color.surface,
    boxShadow: shadow.float,
  },
  wide: { width: WIDTH, padding: space[4] },
  beside: { maxWidth: BESIDE_MAX, paddingVertical: space[2], paddingHorizontal: space[3] },
  rows: { gap: space[2] },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space[3] },
  name: { ...text.label, color: color.inkMuted },
  value: { ...text.label, flexShrink: 1, color: color.ink, textAlign: 'right' },
  basis: { gap: space[1], paddingTop: space[2], borderTopWidth: 1, borderTopColor: color.border },
  basisLine: { ...text.caption, color: color.inkMuted },
});
