/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ConditionChip } from '@/api/assistant-types';
import type { Lookup } from '@/api/lookup-types';
import { Button, color, Icon, size, space, text } from '@/design-system';
import { type GuideAction, mainActionOf, type ShownLookup } from '@/features/assistant/use-shown-lookup';
import { AnswerLines } from './answer-lines';
import { ReadOnlyChip } from './condition-chips';
import { TimeBand } from './time-band';

// As high as the answer's chips, whose touch area "근거" shares.
const CHIP_HEIGHT = 34;
const HIT_SLOP = (size.touchMin - CHIP_HEIGHT) / 2;
const NO_WINDOW = { from: null, until: null };

function ignoreDrop(): void {
  // A Lookup's band has no handles.
}

interface ChipsProps {
  chips: readonly ConditionChip[];
  // Null when the Lookup has no basis.
  basis: { open: boolean; toggle: () => void } | null;
}

// The conditions the Lookup used, which take no press, in lines that wrap, with "근거" or "근거 접기" fixed at the
// right of the first line, as on a Plan's card.
function Chips({ chips, basis }: ChipsProps): ReactElement {
  const words = basis?.open === true ? '근거 접기' : '근거';
  return (
    <View style={styles.row}>
      <View style={styles.chips}>
        {chips.map((chip) => (
          <ReadOnlyChip
            key={`${chip.kind}-${chip.userId ?? chip.text}`}
            label={chip.text}
            marked={chip.kind === 'person'}
          />
        ))}
      </View>
      {basis === null ? null : (
        <Pressable
          accessibilityLabel={words}
          accessibilityRole="button"
          hitSlop={HIT_SLOP}
          onPress={basis.toggle}
          style={({ pressed }) => [styles.corner, pressed && styles.pressed]}
        >
          <Text style={styles.cornerLabel}>{words}</Text>
          <Icon color={color.blue600} name={basis.open ? 'chevronUp' : 'chevronRight'} size={14} />
        </Pressable>
      )}
    </View>
  );
}

interface ButtonsProps {
  main: GuideAction | null;
  guide: (to: GuideAction['to']) => void;
  onClose: () => void;
}

// "길 안내" with "닫기" beside it, or "닫기" alone across the card.
function Buttons({ main, guide, onClose }: ButtonsProps): ReactElement {
  if (main === null) {
    return (
      <Button full onPress={onClose} variant="secondary">
        닫기
      </Button>
    );
  }
  return (
    <View style={styles.buttons}>
      <View style={styles.main}>
        <Button
          full
          onPress={() => {
            guide(main.to);
          }}
        >
          길 안내
        </Button>
      </View>
      <Button onPress={onClose} variant="secondary">
        닫기
      </Button>
    </View>
  );
}

interface LookupCardProps {
  lookup: Lookup;
  shown: ShownLookup;
  onClose: () => void;
}

// A Lookup in the answer frame's card, as a Plan's card without its arrows and "이대로 초대": its chips, its two lines,
// the basis while open, the band without handles when a time matters, and the first action the app draws as the main
// button beside "닫기".
export function LookupCard({ lookup, shown, onClose }: LookupCardProps): ReactElement {
  const { basisOpen, toggleBasis, guide } = shown;
  return (
    <View style={styles.card} testID="lookup-card">
      <Chips basis={lookup.basis.length === 0 ? null : { open: basisOpen, toggle: toggleBasis }} chips={lookup.chips} />
      <AnswerLines lines={lookup.lines} />
      {basisOpen ? (
        <View style={styles.basis}>
          {lookup.basis.map((line) => (
            <Text key={line} style={styles.basisLine}>
              {line}
            </Text>
          ))}
        </View>
      ) : null}
      {lookup.band === null ? null : (
        <TimeBand
          band={lookup.band}
          disabled
          fixed={NO_WINDOW}
          focus={null}
          ghost={null}
          handles={false}
          onDrop={ignoreDrop}
        />
      )}
      <Buttons guide={guide} main={mainActionOf(lookup)} onClose={onClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: space[3] },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2] },
  chips: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  corner: { flexDirection: 'row', alignItems: 'center', gap: 2, height: CHIP_HEIGHT },
  cornerLabel: { ...text.label, color: color.blue600 },
  pressed: { opacity: 0.6 },
  basis: { gap: space[1] },
  basisLine: { ...text.body, color: color.inkMuted },
  buttons: { flexDirection: 'row', gap: space[2] },
  main: { flex: 1 },
});
