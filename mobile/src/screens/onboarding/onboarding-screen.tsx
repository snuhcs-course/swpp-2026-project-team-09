import type { ReactElement } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cardStyles, color, space, text } from '@/design-system';
import { useSession } from '@/session/session';
import { CourseLevelField, GenderField } from './choice-fields';
import { DepartmentField } from './department-field';
import { FieldLabel } from './field-label';
import { Foot } from './foot';
import { canSave, type ChangeForm, type Form, LONGEST_NAME, useForm } from './form';
import { Input } from './input';
import { InterestsSection } from './interests-section';
import { lengthOf } from './length';
import { RevealContext, useRevealer } from './reveal';
import { useOnboarding } from './use-onboarding';
import { YearField } from './year-field';

const WIDEST = 390;

function NameField({ form, change }: { form: Form; change: ChangeForm }): ReactElement {
  return (
    <View style={styles.field}>
      <FieldLabel required suggested={form.nameSuggested}>
        이름
      </FieldLabel>
      <Input
        label="이름"
        most={LONGEST_NAME}
        onChangeText={(name) => {
          change({ name, nameSuggested: false });
        }}
        placeholder="이름"
        value={form.name}
      />
      <Text accessibilityLabel={`${lengthOf(form.name)}자, 최대 ${LONGEST_NAME}자`} style={styles.count}>
        {`${lengthOf(form.name)}/${LONGEST_NAME}`}
      </Text>
    </View>
  );
}

// The fields about the User. A badge leaves its field with the User's first change there, and another course level
// has other departments, so it clears the one chosen.
function BasicSection({ form, change }: { form: Form; change: ChangeForm }): ReactElement {
  return (
    <View style={[cardStyles.card, styles.section]}>
      <Text accessibilityRole="header" style={styles.title}>
        기본 정보
      </Text>
      <NameField change={change} form={form} />
      <CourseLevelField
        onChange={(level) => {
          if (level !== form.level) {
            change({ level, department: '', departmentSuggested: false });
          }
        }}
        value={form.level}
      />
      <DepartmentField
        // The search starts again with the other course level's list.
        key={form.level}
        level={form.level}
        onChange={(department) => {
          change({ department, departmentSuggested: false });
        }}
        suggested={form.departmentSuggested}
        value={form.department}
      />
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
// on it leads back: a User who signed in with the wrong account signs out.
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
          <Text style={styles.sentence}>이름과 학과만 채우면 바로 시작해요</Text>
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
  field: { gap: space[2] },
  count: { ...text.caption, alignSelf: 'flex-end', color: color.inkMuted },
  // What is seen of the form, between the head and the foot or the keyboard.
  frame: { flex: 1 },
});
