/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import type { Choice } from '@/api/assistant-types';
import { Chip, space } from '@/design-system';

interface ChatChoicesProps {
  choices: readonly Choice[];
  onChoose: (choice: Choice) => void;
}

// The candidates an answer asks the User to choose among, as chips under it: those of one kind on a row of their own,
// in the order the Assistant gave them. A press sends the candidate as the User's choice.
export function ChatChoices({ choices, onChoose }: ChatChoicesProps): ReactElement {
  const rows = new Map<Choice['kind'], Choice[]>();
  for (const choice of choices) {
    rows.set(choice.kind, [...(rows.get(choice.kind) ?? []), choice]);
  }
  return (
    <>
      {[...rows].map(([kind, row]) => (
        <View key={kind} style={styles.row} testID={`choices-${kind}`}>
          {row.map((choice) => (
            <Chip
              key={choice.id}
              onPress={() => {
                onChoose(choice);
              }}
            >
              {choice.label}
            </Chip>
          ))}
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginTop: space[2] },
});
