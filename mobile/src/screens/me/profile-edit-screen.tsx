/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { type ReactElement, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { apiClient } from '@/api/client';
import { LOBBY_KEY, lobbyQuery } from '@/api/queries';
import type { Lobby, Profile, ProfileChange } from '@/api/types';
import { Button, cardStyles, color, FullScreenPanel, LoadingState, space, text, useToast } from '@/design-system';
import { DepartmentField } from '../onboarding/department-field';
import { isDepartment } from '../onboarding/department-search';
import type { CourseLevel } from '../onboarding/departments';
import { admissionYears, type YearChoice } from '../onboarding/form';
import { InterestsSection } from '../onboarding/interests-section';
import { NameField } from '../onboarding/name-field';
import { YearField } from '../onboarding/year-field';

const NOT_SAVED = '저장하지 못했어요. 다시 시도해 주세요';

interface Edit {
  name: string;
  department: string;
  year: YearChoice;
  // Without the '#'.
  interests: readonly string[];
}

// Onboarding's choice for an admission year: a year of its list, "그 외" for any other, and none without one.
function yearChoiceOf(admissionYear: number | null): YearChoice {
  if (admissionYear === null) {
    return null;
  }
  return admissionYears().includes(admissionYear) ? admissionYear : 'other';
}

// The fields the User changed, as the main server takes them.
function changesOf(profile: Profile, edit: Edit): ProfileChange {
  const change: ProfileChange = {};
  const name = edit.name.trim();
  if (name !== profile.name) {
    change.name = name;
  }
  if (edit.department !== profile.department) {
    change.department = edit.department;
  }
  if (edit.year !== yearChoiceOf(profile.admissionYear)) {
    change.admissionYear = typeof edit.year === 'number' ? edit.year : null;
  }
  if (edit.interests.join('\n') !== profile.hashtags.join('\n')) {
    change.hashtags = [...edit.interests];
  }
  return change;
}

// The department list a department is found in: a graduate one only in the graduate list.
function levelOf(department: string): CourseLevel {
  return isDepartment('graduate', department) && !isDepartment('undergraduate', department)
    ? 'graduate'
    : 'undergraduate';
}

// Sends the changed fields; the answer's profile replaces the Lobby's, and the screen goes back. A failure leaves the
// form as it is.
function useSave(profile: Profile): { working: boolean; save: (edit: Edit) => void } {
  const queryClient = useQueryClient();
  const showToast = useToast();
  const [working, setWorking] = useState(false);
  const save = (edit: Edit): void => {
    const change = changesOf(profile, edit);
    if (Object.keys(change).length === 0) {
      router.back();
      return;
    }
    setWorking(true);
    apiClient.updateProfile(change).then(
      (saved) => {
        queryClient.setQueryData<Lobby>(LOBBY_KEY, (lobby) => lobby && { ...lobby, profile: saved });
        router.back();
      },
      () => {
        setWorking(false);
        showToast(NOT_SAVED);
      },
    );
  };
  return { working, save };
}

interface BasicSectionProps {
  edit: Edit;
  level: CourseLevel;
  change: (changed: Partial<Edit>) => void;
}

function BasicSection({ edit, level, change }: BasicSectionProps): ReactElement {
  return (
    <View style={[cardStyles.card, styles.section]}>
      <Text accessibilityRole="header" style={styles.title}>
        기본 정보
      </Text>
      <NameField
        onChange={(name) => {
          change({ name });
        }}
        value={edit.name}
      />
      <DepartmentField
        level={level}
        onChange={(department) => {
          change({ department });
        }}
        suggested={false}
        value={edit.department}
      />
      <YearField
        onChange={(year) => {
          change({ year });
        }}
        value={edit.year}
      />
    </View>
  );
}

function EditForm({ profile }: { profile: Profile }): ReactElement {
  const [edit, setEdit] = useState<Edit>(() => ({
    name: profile.name,
    department: profile.department,
    year: yearChoiceOf(profile.admissionYear),
    interests: profile.hashtags,
  }));
  const [level] = useState(() => levelOf(profile.department));
  const { working, save } = useSave(profile);
  const change = (changed: Partial<Edit>): void => {
    setEdit((held) => ({ ...held, ...changed }));
  };
  return (
    <FullScreenPanel
      footer={
        <Button
          disabled={working || edit.name.trim() === '' || edit.department === ''}
          full
          onPress={() => {
            save(edit);
          }}
          size="lg"
        >
          저장
        </Button>
      }
      leave={{ kind: 'back', onPress: router.back }}
      subtle
      title="프로필 편집"
    >
      <View style={styles.body}>
        <BasicSection change={change} edit={edit} level={level} />
        <InterestsSection
          interests={edit.interests}
          onChange={(interests) => {
            change({ interests });
          }}
        />
      </View>
    </FullScreenPanel>
  );
}

// 프로필 편집, the `ProfileEdit` frame with the fields the main server stores, from the Lobby's profile.
export function ProfileEditScreen(): ReactElement {
  const profile = useQuery(lobbyQuery).data?.profile;
  if (profile === undefined) {
    return (
      <FullScreenPanel leave={{ kind: 'back', onPress: router.back }} subtle title="프로필 편집">
        <LoadingState />
      </FullScreenPanel>
    );
  }
  return <EditForm profile={profile} />;
}

const styles = StyleSheet.create({
  body: { gap: space[3], padding: space[4], paddingBottom: space[6] },
  section: { gap: space[4] },
  title: { ...text.title, color: color.ink },
});
