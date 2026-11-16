/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { AnswerLine, Plan } from '@/api/assistant-types';
import { Button, color, font, space, text } from '@/design-system';
import { type HowAboutRow, howAboutOf, noteOf, rowsOf } from '@/features/assistant/how-about';
import type { HowAbout } from '@/features/assistant/use-how-about';

interface HowAboutCardProps {
  howAbout: HowAbout;
  // The Plan on screen, which the new one is told against.
  current: Plan;
}

function Rows({ rows }: { rows: readonly HowAboutRow[] }): ReactElement {
  return (
    <View style={styles.rows} testID="how-about-rows">
      {rows.map(({ userId, name, words }) => (
        <View key={userId} style={styles.row} testID="how-about-row">
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.words}>{words}</Text>
        </View>
      ))}
    </View>
  );
}

function WarningLines({ lines }: { lines: readonly AnswerLine[] }): ReactElement {
  return (
    <View testID="how-about-lines">
      {lines.map((line) => {
        const words = line.map((part) => part.text).join('');
        return (
          <Text key={words} style={styles.warning}>
            {words}
          </Text>
        );
      })}
    </View>
  );
}

// The card of a building pressed while a meal's Plan is on screen: "여기면 어때?" over the Place's name, one row per
// person with when they get there, and the time together against the Plan on screen, with "여기로 바꾸기" and "그대로".
// A Place that does not fit has the kicker in the warning colour, the rows of the Place that was dropped, the server's
// two lines, and "그대로" alone. While it is asked the card says "보는 중이에요".
export function HowAboutCard({ howAbout, current }: HowAboutCardProps): ReactElement | null {
  const { place, title, reply, keep, change } = howAbout;
  if (place === null) {
    return null;
  }
  const answer = reply === null ? null : howAboutOf(reply, place.id);
  const fits = answer?.fits !== false;
  return (
    <View style={styles.card} testID="how-about-card">
      <View>
        <Text style={[styles.kicker, fits ? styles.fits : styles.unfit]}>여기면 어때?</Text>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
      </View>
      {answer === null ? <Text style={styles.asking}>보는 중이에요</Text> : null}
      {answer?.fits === true ? (
        <>
          <Rows rows={rowsOf(answer.plan.parts)} />
          <Text style={styles.note}>{noteOf(answer.plan, current)}</Text>
        </>
      ) : null}
      {answer?.fits === false ? (
        <>
          <Rows rows={rowsOf(answer.parts)} />
          <WarningLines lines={answer.lines} />
        </>
      ) : null}
      <View style={styles.buttons}>
        {answer?.fits === true ? (
          <View style={styles.main}>
            <Button full onPress={change}>
              여기로 바꾸기
            </Button>
          </View>
        ) : null}
        <View style={answer?.fits === true ? undefined : styles.main}>
          <Button full={answer?.fits !== true} onPress={keep} variant="secondary">
            그대로
          </Button>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: space[3] },
  kicker: { ...text.caption, fontFamily: font.semiBold },
  fits: { color: color.quest },
  unfit: { color: color.warning },
  title: { ...text.title, color: color.ink },
  asking: { ...text.body, color: color.inkMuted },
  rows: { gap: space[1] },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space[3] },
  name: { ...text.body, color: color.ink },
  words: { ...text.body, fontFamily: font.semiBold, color: color.ink },
  note: { ...text.body, color: color.quest },
  warning: { ...text.body, color: color.warning },
  buttons: { flexDirection: 'row', gap: space[2] },
  main: { flex: 1 },
});
