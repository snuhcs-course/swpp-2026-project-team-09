/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-11-19  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cardStyles, color, space, text } from '@/design-system';
import { useSession } from '@/session/session';
import { CourseLevelField, GenderField } from './choice-fields';
import { DepartmentField } from './department-field';
import { AccountLine, FixedField } from './fixed-field';
import { Foot } from './foot';
import { canSave, type ChangeForm, type Form, useForm } from './form';
import { InterestsSection } from './interests-section';
import { NameField } from './name-field';
import { RevealContext, useRevealer } from './reveal';
import { useOnboarding } from './use-onboarding';
import { YearField } from './year-field';

const WIDEST = 390;

function headSentence({ fromAccount }: Form): string {
  if (fromAccount.name && fromAccount.department) {
    return '확인하고 바로 시작해요';
  }
  if (fromAccount.name) {
    return '학과만 채우면 바로 시작해요';
  }
  return fromAccount.department ? '이름만 채우면 바로 시작해요' : '이름과 학과만 채우면 바로 시작해요';
}

// The name, or the account's fixed.
function NameRow({ form, change }: { form: Form; change: ChangeForm }): ReactElement {
  if (form.fromAccount.name) {
    return <FixedField label="이름" value={form.name} />;
  }
  return (
    <NameField
      onChange={(name) => {
        change({ name });
      }}
      value={form.name}
    />
  );
}

// The account's department fixed, or the course level and a department from its list. The course level only picks
// the list, so it is not asked beside a fixed department, and another one clears the department chosen.
function DepartmentRows({ form, change }: { form: Form; change: ChangeForm }): ReactElement {
  const { fromAccount } = form;
  if (fromAccount.department) {
    return (
      <>
        <FixedField label="학과" value={form.department} />
        <AccountLine fromAccount={fromAccount} />
      </>
    );
  }
  return (
    <>
      {fromAccount.name ? <AccountLine fromAccount={fromAccount} /> : null}
      <CourseLevelField
        onChange={(level) => {
          if (level !== form.level) {
            change({ level, department: '' });
          }
        }}
        value={form.level}
      />
      <DepartmentField
        // The search starts again with the other course level's list.
        key={form.level}
        level={form.level}
        onChange={(department) => {
          change({ department });
        }}
        value={form.department}
      />
    </>
  );
}

// The fields about the User.
function BasicSection({ form, change }: { form: Form; change: ChangeForm }): ReactElement {
  return (
    <View style={[cardStyles.card, styles.section]}>
      <Text accessibilityRole="header" style={styles.title}>
        기본 정보
      </Text>
      <NameRow change={change} form={form} />
      <DepartmentRows change={change} form={form} />
      <YearField
        onChange={(year) => {
          change({ year });
        }}
        value={form.year}
      />
      <GenderField
        onChange={(gender) => {
          change({ gender });
        }}
        onChangeWords={(genderText) => {
          change({ genderText });
        }}
        value={form.gender}
        words={form.genderText}
      />
    </View>
  );
}

// Where a new User confirms a name and a department after the first sign-in and adds what else they like. Nothing
// on it leads back: a User who signed in with the wrong account signs out. The head says what is left to fill in.
export function OnboardingScreen(): ReactElement {
  const insets = useSafeAreaInsets();
  const { suggestion } = useSession();
  const { form, change } = useForm(suggestion);
  const { working, save, out } = useOnboarding();
  const revealer = useRevealer();
  return (
    <KeyboardAvoidingView behavior="padding" style={styles.screen}>
      <View style={styles.column}>
        <View style={[styles.head, { paddingTop: insets.top + space[4] }]}>
          <Text accessibilityRole="header" style={styles.heading}>
            프로필 만들기
          </Text>
          <Text style={styles.sentence}>{headSentence(form)}</Text>
        </View>
        <View onLayout={revealer.settle} ref={revealer.frame} style={styles.frame}>
          <ScrollView
            contentContainerStyle={styles.form}
            keyboardShouldPersistTaps="handled"
            onScroll={revealer.onScroll}
            ref={revealer.scroll}
            scrollEventThrottle={16}
          >
            <RevealContext value={revealer}>
              <BasicSection change={change} form={form} />
              <InterestsSection
                interests={form.interests}
                onChange={(interests) => {
                  change({ interests });
                }}
              />
            </RevealContext>
          </ScrollView>
        </View>
        <Foot
          onOut={out}
          onSave={() => {
            save(form);
          }}
          ready={canSave(form)}
          working={working}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surfaceSubtle },
  // A phone's width, in the middle of a wider screen.
  column: { flex: 1, alignSelf: 'center', width: '100%', maxWidth: WIDEST },
  head: {
    gap: space[1],
    paddingHorizontal: space[5],
    paddingBottom: space[4],
    borderBottomWidth: 1,
    borderBottomColor: color.border,
    backgroundColor: color.surface,
  },
  heading: { ...text.titleLg, color: color.ink },
  sentence: { ...text.body, color: color.inkMuted },
  form: { gap: space[3], paddingTop: space[4], paddingHorizontal: space[4], paddingBottom: space[6] },
  section: { gap: space[4] },
  title: { ...text.title, color: color.ink },
  // What is seen of the form, between the head and the foot or the keyboard.
  frame: { flex: 1 },
});
