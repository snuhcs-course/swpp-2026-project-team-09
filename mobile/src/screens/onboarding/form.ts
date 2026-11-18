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

export type GenderChoice = 'none' | 'female' | 'male' | 'custom';

// The admission year the User chose: a year, "그 외", or no choice yet.
export type YearChoice = number | 'other' | null;

// What the User has put into Onboarding's fields so far.
export interface Form {
  // The SNU account's, which cannot be changed.
  name: string;
  department: string;
  year: YearChoice;
  gender: GenderChoice;
  // The User's own words for "직접 입력".
  genderText: string;
  // Without the '#'.
  interests: readonly string[];
}

// The name's limit, which the 학적상 이름 shares.
export const LONGEST_NAME = 30;
const YEARS = 12;

// The form a User starts with: the name and the department that the account gives, each empty where it gives none.
export function firstForm(suggestion: Suggestion | null): Form {
  return {
    name: suggestion?.name ?? '',
    department: suggestion?.department ?? '',
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
    name: form.name,
    department: form.department,
    admissionYear: typeof form.year === 'number' ? form.year : null,
    hashtags: [...form.interests],
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
