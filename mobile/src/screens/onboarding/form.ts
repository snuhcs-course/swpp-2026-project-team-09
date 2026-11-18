/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-19  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useState } from 'react';
import type { Gender, OnboardingAnswers, Suggestion } from '@/api/types';
import { now } from '@/clock';
import { koreaYear } from '@/korea-time';
import type { CourseLevel } from './departments';
import type { FromAccount } from './fixed-field';
import { cut } from './length';

export type GenderChoice = 'none' | 'female' | 'male' | 'custom';

// The admission year the User chose: a year, "그 외", or no choice yet.
export type YearChoice = number | 'other' | null;

// What the User has put into Onboarding's fields so far.
export interface Form {
  name: string;
  level: CourseLevel;
  // A name from the course level's list, or empty, unless the account gives it.
  department: string;
  // The SNU account gives these, and they cannot be changed.
  fromAccount: FromAccount;
  year: YearChoice;
  gender: GenderChoice;
  // The User's own words for "직접 입력".
  genderText: string;
  // Without the '#'.
  interests: readonly string[];
}

export const LONGEST_NAME = 30;
const YEARS = 12;

// The form a User starts with: undergraduate, and the name and the department that the account gives. A part it does
// not give stays empty, for the User to fill in.
export function firstForm(suggestion: Suggestion | null): Form {
  const name = cut(suggestion?.name ?? '', LONGEST_NAME);
  const department = suggestion?.department ?? '';
  return {
    name,
    level: 'undergraduate',
    department,
    fromAccount: { name: name !== '', department: department !== '' },
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
