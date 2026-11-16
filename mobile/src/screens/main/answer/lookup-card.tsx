/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ConditionChip } from '@/api/assistant-types';
import type { Lookup, LookupAction } from '@/api/lookup-types';
import type { Refusal } from '@/api/refusal-types';
import { Button, color, Icon, size, space, text } from '@/design-system';
import { mainActionOf, type ShownLookup } from '@/features/assistant/use-shown-lookup';
import { AnswerLines } from './answer-lines';
import { CardNote } from './card-note';
import { ReadOnlyChip } from './condition-chips';
import { isButton, pressOffer } from './refusal-reply';
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
export function Chips({ chips, basis }: ChipsProps): ReactElement {
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

interface MainButton {
  label: string;
  onPress: () => void;
}

type AskAction = Extract<LookupAction, { kind: 'ask' }>;

interface ButtonsProps {
  main: MainButton | null;
  // The Lookup's `ask` actions, whose words are sent as if typed ("관정 보기").
  asks: readonly AskAction[];
  onAsk: (words: string) => void;
  onClose: () => void;
}

// "길 안내" and any `ask` with "닫기" beside them, or "닫기" alone across the card.
function Buttons({ main, asks, onAsk, onClose }: ButtonsProps): ReactElement {
  if (main === null && asks.length === 0) {
    return (
      <Button full onPress={onClose} variant="secondary">
        닫기
      </Button>
    );
  }
  return (
    <View style={styles.buttons}>
      {main === null ? null : (
        <View style={styles.main}>
          <Button full onPress={main.onPress}>
            {main.label}
          </Button>
        </View>
      )}
      {asks.map(({ label, text: words }) => (
        <Button
          key={label}
          onPress={() => {
            onAsk(words);
          }}
          variant="secondary"
        >
          {label}
        </Button>
      ))}
      <Button onPress={onClose} variant="secondary">
        닫기
      </Button>
    </View>
  );
}

interface LookupCardProps {
  lookup: Lookup;
  shown: ShownLookup;
  // A refusal of the part that cannot be answered, beside the Lookup (boards n4, n20), or null.
  refusal: Refusal | null;
  onAsk: (words: string) => void;
  onClose: () => void;
}

// The refusal's first offer, else "길 안내" when the Lookup has it.
function mainOf({ lookup, shown, refusal, onAsk }: LookupCardProps): MainButton | null {
  const offer = refusal?.offers.find(isButton);
  if (offer !== undefined) {
    return {
      label: offer.label,
      onPress: () => {
        pressOffer(offer, onAsk);
      },
    };
  }
  const guide = mainActionOf(lookup);
  return guide === null
    ? null
    : {
        label: lookup.kind === 'study' ? '가는 길' : '길 안내',
        onPress: () => {
          shown.guide(guide.to);
        },
      };
}

// The Lookup's `ask` actions, none beside a refusal, whose offers stand in their place.
function asksOf({ lookup, refusal }: LookupCardProps): AskAction[] {
  return refusal === null ? lookup.actions.filter((action): action is AskAction => action.kind === 'ask') : [];
}

// A Lookup in the answer frame's card, as a Plan's card without its arrows and "이대로 초대": its chips, its two lines,
// the basis while open, the band without handles when a time matters, and the first action the app draws as the main
// button, then its `ask` actions, beside "닫기". The main button of a `study` Lookup ("이 근처") reads "가는 길". Beside a
// refusal, the refusal's lines stand in place of the Lookup's, and its offer in place of the buttons.
export function LookupCard(props: LookupCardProps): ReactElement {
  const { lookup, shown, refusal, onClose } = props;
  const { basisOpen, toggleBasis } = shown;
  return (
    <View style={styles.card} testID="lookup-card">
      <Chips basis={lookup.basis.length === 0 ? null : { open: basisOpen, toggle: toggleBasis }} chips={lookup.chips} />
      <AnswerLines lines={refusal?.lines ?? lookup.lines} />
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
      <CardNote note={lookup.note} />
      <Buttons asks={asksOf(props)} main={mainOf(props)} onAsk={props.onAsk} onClose={onClose} />
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
