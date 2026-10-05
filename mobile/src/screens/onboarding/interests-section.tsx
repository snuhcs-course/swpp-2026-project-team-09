import { type ReactElement, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, cardStyles, Chip, color, space, text } from '@/design-system';
import { Input } from './input';
import {
  interestOf,
  isFull,
  LONGEST_INTEREST,
  MOST_INTERESTS,
  suggestedFor,
  tidyDraft,
  withInterest,
} from './interests';
import { Pill } from './pill';

interface InterestsSectionProps {
  // Without the '#'.
  interests: readonly string[];
  onChange: (interests: readonly string[]) => void;
}

function Suggested({
  interests,
  onAdd,
}: {
  interests: readonly string[];
  onAdd: (interest: string) => void;
}): ReactElement {
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

// The field an interest is typed into, and its button. The keyboard's own button adds too.
function Adding({ full, onAdd }: { full: boolean; onAdd: (typed: string) => void }): ReactElement {
  const [draft, setDraft] = useState('');
  const add = (): void => {
    onAdd(draft);
    setDraft('');
  };
  return (
    <View style={styles.adding}>
      <Input
        label="관심사 추가"
        // One more than an interest's length, for the '#' a User may type in front.
        maxLength={LONGEST_INTEREST + 1}
        onChangeText={(typed) => {
          setDraft(tidyDraft(typed));
        }}
        onSubmit={() => {
          add();
        }}
        placeholder={full ? `${MOST_INTERESTS}개까지 넣을 수 있어요` : '#관심사'}
        style={styles.draft}
        value={draft}
      />
      <Button
        centred
        disabled={interestOf(draft) === '' || full}
        onPress={() => {
          add();
        }}
      >
        추가
      </Button>
    </View>
  );
}

// The User's interests: typed in, or taken from the suggested ones with a press. Each is shown with a '#'.
export function InterestsSection({ interests, onChange }: InterestsSectionProps): ReactElement {
  const full = isFull(interests);
  const add = (typed: string): void => {
    onChange(withInterest(interests, typed));
  };
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
      <Adding full={full} onAdd={add} />
      <Suggested interests={interests} onAdd={add} />
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
  suggested: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: space[2] },
});
