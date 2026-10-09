// AI-generated with Claude Opus 5.5, 2026-10-05, prompted by AhnJinYoung
import { useState } from 'react';
import type { Gender, OnboardingAnswers, Suggestion } from '@/api/types';
import { now } from '@/clock';
import { koreaYear } from '@/korea-time';
import { isDepartment } from './department-search';
import type { CourseLevel } from './departments';
import { cut } from './length';

export type GenderChoice = 'none' | 'female' | 'male' | 'custom';

// The admission year the User chose: a year, "그 외", or no choice yet.
export type YearChoice = number | 'other' | null;

// What the User has put into Onboarding's fields so far.
export interface Form {
  name: string;
  // The name is still the one the sign-in suggested.
  nameSuggested: boolean;
  level: CourseLevel;
  // A name from the course level's list, or empty.
  department: string;
  departmentSuggested: boolean;
  year: YearChoice;
  gender: GenderChoice;
  // The User's own words for "직접 입력".
  genderText: string;
  // Without the '#'.
  interests: readonly string[];
}

export const LONGEST_NAME = 30;
const YEARS = 12;

// The form a User starts with: undergraduate, and the suggestion's name and department. A part the suggestion lacks
// stays empty, and so does a department that is not in the list.
export function firstForm(suggestion: Suggestion | null): Form {
  const name = cut(suggestion?.name ?? '', LONGEST_NAME);
  const suggested = suggestion?.department ?? '';
  const department = isDepartment('undergraduate', suggested) ? suggested : '';
  return {
    name,
    nameSuggested: name !== '',
    level: 'undergraduate',
    department,
    departmentSuggested: department !== '',
    year: null,
    gender: 'none',
    genderText: '',
    interests: [],
  };
}

// This year and the eleven before it, the newest first.
export function admissionYears(): number[] {
  const thisYear = koreaYear(now());
  return Array.from({ length: YEARS }, (_, back) => thisYear - back);
}

// "22학번"
export function yearLabel(year: number): string {
  return `${String(year % 100).padStart(2, '0')}학번`;
}

export function canSave(form: Form): boolean {
  return form.name.trim() !== '' && form.department !== '';
}

function genderOf(form: Form): Gender | null {
  if (form.gender === 'female' || form.gender === 'male') {
    return { kind: form.gender };
  }
  const text = form.genderText.trim();
  return form.gender === 'custom' && text !== '' ? { kind: 'custom', text } : null;
}

// What is saved. "그 외" stores no admission year, and "직접 입력" without words no gender.
export function answersOf(form: Form): OnboardingAnswers {
  return {
    name: form.name.trim(),
    department: form.department,
    admissionYear: typeof form.year === 'number' ? form.year : null,
    hashtags: [...form.interests],
    courseLevel: form.level,
    gender: genderOf(form),
  };
}

export type ChangeForm = (change: Partial<Form>) => void;

export function useForm(suggestion: Suggestion | null): { form: Form; change: ChangeForm } {
  const [form, setForm] = useState(() => firstForm(suggestion));
  const change: ChangeForm = (changed) => {
    setForm((held) => ({ ...held, ...changed }));
  };
  return { form, change };
}
