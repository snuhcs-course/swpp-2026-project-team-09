// AI-generated with Claude Opus 5.5, 2026-10-05, prompted by AhnJinYoung
import { type ReactElement, useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Platform,
  Pressable,
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { cardStyles, Chip, color, font, radius, size, space, text } from '@/design-system';
import { Input } from './input';
import {
  addInterests,
  interestsIn,
  isFull,
  MOST_INTERESTS,
  type Refusal,
  REFUSAL_WORDS,
  suggestedFor,
} from './interests';
import { Pill, PILL_ROW_GAP } from './pill';

interface InterestsSectionProps {
  // Without the '#'.
  interests: readonly string[];
  onChange: (interests: readonly string[]) => void;
}

interface SuggestedProps {
  interests: readonly string[];
  onAdd: (interest: string) => void;
}

function Suggested({ interests, onAdd }: SuggestedProps): ReactElement {
  return (
    <View style={styles.suggested}>
      <Text style={styles.small}>추천</Text>
      {suggestedFor(interests).map((interest) => (
        <Pill
          key={interest}
          label={`#${interest} 추가`}
          onPress={() => {
            onAdd(interest);
          }}
        >
          {`+ #${interest}`}
        </Pill>
      ))}
    </View>
  );
}

// The frame's button beside the field, as high as the field. The design system's Button is lower or higher.
function AddButton({ disabled, onPress }: { disabled: boolean; onPress: () => void }): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }): StyleProp<ViewStyle> => [
        styles.add,
        pressed && styles.addPressed,
        disabled && styles.addDisabled,
      ]}
    >
      <Text style={[styles.addWords, disabled && styles.addWordsDisabled]}>추가</Text>
    </Pressable>
  );
}

// Why an interest was not added, under the field. iOS has no live regions: there the words are announced by hand.
function Why({ refusal }: { refusal: Refusal }): ReactElement {
  const words = REFUSAL_WORDS[refusal];
  useEffect(() => {
    if (Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility(words);
    }
  }, [words]);
  return (
    <Text accessibilityLiveRegion="polite" accessibilityRole="alert" style={styles.why}>
      {words}
    </Text>
  );
}

interface AddingProps {
  interests: readonly string[];
  onChange: (interests: readonly string[]) => void;
}

// The field interests are typed or pasted into, several at once if the User likes, and its button. The keyboard's
// own button adds too. What was not added stays in the field, with the reason under it until the User types again.
function Adding({ interests, onChange }: AddingProps): ReactElement {
  const [draft, setDraft] = useState('');
  const [refusal, setRefusal] = useState<Refusal | null>(null);
  const add = (): void => {
    const added = addInterests(interests, draft);
    onChange(added.interests);
    setDraft(added.left);
    setRefusal(added.refusal);
  };
  return (
    <>
      <View style={styles.adding}>
        <Input
          hint={refusal === null ? undefined : REFUSAL_WORDS[refusal]}
          label="관심사 추가"
          onChangeText={(typed) => {
            setDraft(typed);
            setRefusal(null);
          }}
          onSubmit={add}
          placeholder={isFull(interests) ? `${MOST_INTERESTS}개까지 넣을 수 있어요` : '#관심사'}
          style={styles.draft}
          value={draft}
        />
        <AddButton disabled={interestsIn(draft).length === 0} onPress={add} />
      </View>
      {refusal === null ? null : <Why refusal={refusal} />}
    </>
  );
}

// The User's interests: typed in, or taken from the suggested ones with a press. Each is shown with a '#'.
export function InterestsSection({ interests, onChange }: InterestsSectionProps): ReactElement {
  return (
    <View style={[cardStyles.card, styles.section]}>
      <View style={styles.head}>
        <Text accessibilityRole="header" style={styles.title}>
          관심사
        </Text>
        <Text accessibilityLabel={`관심사 ${interests.length}개, 최대 ${MOST_INTERESTS}개`} style={styles.small}>
          {`${interests.length}/${MOST_INTERESTS}`}
        </Text>
      </View>
      {interests.length === 0 ? null : (
        <View style={styles.chips}>
          {interests.map((interest) => (
            <Chip
              key={interest}
              onRemove={() => {
                onChange(interests.filter((held) => held !== interest));
              }}
              selected
            >
              {`#${interest}`}
            </Chip>
          ))}
        </View>
      )}
      <Adding interests={interests} onChange={onChange} />
      <Suggested
        interests={interests}
        onAdd={(interest) => {
          onChange(addInterests(interests, interest).interests);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space[3] },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  title: { ...text.title, color: color.ink },
  small: { ...text.caption, color: color.inkMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  adding: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  draft: { flex: 1, minWidth: 0 },
  add: {
    justifyContent: 'center',
    height: size.touchMin,
    paddingHorizontal: space[4],
    borderRadius: radius.md,
    backgroundColor: color.snuBlue,
  },
  addPressed: { backgroundColor: color.snuBluePressed },
  addDisabled: { backgroundColor: color.surfaceSunken },
  addWords: { ...text.body, fontFamily: font.semiBold, color: color.onPrimary },
  addWordsDisabled: { color: color.inkSubtle },
  why: { ...text.caption, marginTop: -space[1], color: color.danger },
  // What a pill's touch area is higher than the pill, beyond the rows' own space, is taken back around the rows.
  suggested: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: PILL_ROW_GAP.offer,
    marginVertical: -PILL_ROW_GAP.offer / 2,
  },
});
