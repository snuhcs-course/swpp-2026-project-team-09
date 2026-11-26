/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, font, Icon, type IconName, radius, space, text } from '@/design-system';
import { LIBRARY_FAILURE_TEXT, type LibraryFailure } from '@/library/client';
import { needsLogin } from './use-library-call';

// The parts the library cards share, as the MainChatLib frames draw them inside the Assistant's bubble: white boxes
// on the bubble's blue, the space as a row with its round icon, the round buttons under it, and the site's notes.

export function CardBox({ testID, children }: { testID: string; children: ReactNode }): ReactElement {
  return (
    <View style={styles.card} testID={testID}>
      {children}
    </View>
  );
}

// "관정관 7층 열람실 · 7193번" over "오늘 17:00–18:00".
export function SpaceRow({
  title,
  meta,
  icon = 'bookOpen',
}: {
  title: string;
  meta: string;
  icon?: IconName;
}): ReactElement {
  return (
    <View accessibilityLabel={`${title} ${meta}`} accessible style={styles.box}>
      <View style={styles.round}>
        <Icon color={color.onPrimary} name={icon} size={16} />
      </View>
      <View style={styles.words}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.meta}>{meta}</Text>
      </View>
    </View>
  );
}

interface PillProps {
  label: string;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
  // A fuller name where the label alone is ambiguous.
  name?: string;
}

// A round button under a card: the key colour for its main action, outlined for the others.
export function Pill({ label, onPress, primary = false, disabled = false, name }: PillProps): ReactElement {
  return (
    <Pressable
      accessibilityLabel={name ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        primary ? styles.primary : styles.secondary,
        pressed && (primary ? styles.primaryPressed : styles.secondaryPressed),
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.pillLabel, primary && !disabled && styles.primaryLabel, disabled && styles.disabledLabel]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Pills({ children }: { children: ReactNode }): ReactElement {
  return <View style={styles.pills}>{children}</View>;
}

// What the card says: an outcome, an empty list or a failure.
export function Said({ children, tone = 'plain' }: { children: string; tone?: 'plain' | 'danger' }): ReactElement {
  return <Text style={[styles.said, tone === 'danger' && styles.danger]}>{children}</Text>;
}

// The site's rules for this kind of space.
export function Notes({ notes }: { notes: readonly string[] }): ReactElement | null {
  if (notes.length === 0) {
    return null;
  }
  return (
    <View style={styles.notes}>
      {notes.map((note) => (
        <Text key={note} style={styles.note}>
          {`· ${note}`}
        </Text>
      ))}
    </View>
  );
}

// The word of a button that ends a card without a booking: it does not close anything, it declines (P04 ticket 53).
export const DECLINE = '예약 안 함';

// What a card that read the library offers when the read failed for another reason than the session: what it could
// not read, 다시 시도, which reads again, and 예약 안 함.
export interface ReadAgain {
  words: string;
  onRetry: () => void;
  onClose: () => void;
  // The retry's word, "다시 시도" when left out.
  retryWords?: string;
}

// A failure in the card, with 로그인 when the library session is missing or ended.
export function FailureNote({
  failure,
  message,
  onLogIn,
  reading,
}: {
  failure: LibraryFailure | null;
  // The library's own words, or a card's sentence for the failure.
  message?: string;
  // Null where 로그인 is the screen's main button (a booking on the map alone): the note says why, and offers no button.
  onLogIn: (() => void) | null;
  reading?: ReadAgain;
}): ReactElement | null {
  if (failure === null && message === undefined) {
    return null;
  }
  if (reading !== undefined && failure !== null && !needsLogin(failure)) {
    return (
      <View style={styles.failure}>
        <Said tone="danger">{reading.words}</Said>
        <Pills>
          <Pill label={reading.retryWords ?? '다시 시도'} onPress={reading.onRetry} primary />
          <Pill label={DECLINE} onPress={reading.onClose} />
        </Pills>
      </View>
    );
  }
  return (
    <View style={styles.failure}>
      <Said tone="danger">{message ?? (failure === null ? '' : LIBRARY_FAILURE_TEXT[failure])}</Said>
      {failure !== null && needsLogin(failure) && onLogIn !== null ? (
        <Pills>
          <Pill label="로그인" onPress={onLogIn} primary />
        </Pills>
      ) : null}
    </View>
  );
}

const ROUND = 32;

const styles = StyleSheet.create({
  card: { gap: space[2] },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: space[3],
    borderRadius: radius.md,
    backgroundColor: color.surface,
  },
  round: {
    alignItems: 'center',
    justifyContent: 'center',
    width: ROUND,
    height: ROUND,
    borderRadius: 10,
    backgroundColor: color.svcStudy,
  },
  words: { flex: 1, minWidth: 0 },
  title: { fontFamily: font.semiBold, fontSize: 14, lineHeight: 20, color: color.ink },
  meta: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: color.inkMuted },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { justifyContent: 'center', height: 36, paddingHorizontal: 14, borderRadius: radius.full },
  primary: { backgroundColor: color.snuBlue },
  primaryPressed: { backgroundColor: color.snuBluePressed },
  secondary: { borderWidth: 1, borderColor: color.borderStrong, backgroundColor: color.surface },
  secondaryPressed: { backgroundColor: color.blue50 },
  disabled: { borderWidth: 0, backgroundColor: color.surfaceSunken },
  pillLabel: { ...text.label, color: color.snuBlue },
  primaryLabel: { color: color.onPrimary },
  disabledLabel: { color: color.inkMuted },
  said: { ...text.body, color: color.ink },
  danger: { color: color.danger },
  notes: { gap: 2 },
  note: { fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: color.inkMuted },
  failure: { gap: space[2] },
});
