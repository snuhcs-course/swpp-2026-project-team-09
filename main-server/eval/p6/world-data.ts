/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { z } from 'zod';

// The shape of eval/p6/world.yaml, which holds the P6 world by seed name, and what reads it. eval/p6/world.ts seeds it.

// The fake 학번 of the eval worlds (P06 spec, "Privacy boundaries"): 2026-000NN, a range no real student has.
export const FAKE_STUDENT_NUMBER = /^2026-000\d{2}$/u;

// Anything written like a 학번, with or without its hyphen, as the profile accepts one (P06 spec, "Profile").
export const STUDENT_NUMBER_LIKE = /(?<!\d)\d{4}-?\d{5}(?!\d)/gu;

const studentNumberSchema = z.string().regex(FAKE_STUDENT_NUMBER, 'Expected a fake 학번, 2026-000NN');

export const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;

const QUEST_KEYS = ['s-card', 'admin-shuttle', 'kwanjeong', 'health-clinic', 'art-museum'] as const;

const timeSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/u, 'Expected YYYY-MM-DDTHH:MM in Korea');

const questProgressSchema = z
  .strictObject({
    key: z.enum(QUEST_KEYS),
    started: timeSchema,
    completed: timeSchema.optional(),
    completedBy: z.enum(['button', 'checked', 'forced', 'skipped']).optional(),
  })
  .refine(({ completed, completedBy }) => (completed === undefined) === (completedBy === undefined), {
    message: 'Give completed and completedBy together',
  });

// The tutorial progress of a User, with the state it is meant to give (src/tutorial/tutorial-state.ts), which a test
// checks against the server's GET /tutorial.
const tutorialSchema = z.strictObject({
  state: z.enum(['off', 'available', 'active', 'stopped', 'finished']),
  enabled: z.boolean(),
  stopped: timeSchema.optional(),
  finished: timeSchema.optional(),
  quests: z.array(questProgressSchema),
});

const personSchema = z.strictObject({
  name: z.string().min(1),
  department: z.string().min(1),
  registeredName: z.string().min(1),
  studentNumber: studentNumberSchema,
});

const userSchema = personSchema.extend({
  admissionYear: z.int().nullable(),
  affiliation: z.enum(['undergraduate', 'graduate', 'exchange']),
  tutorial: tutorialSchema,
});

const meetingSchema = z.strictObject({
  day: z.enum(WEEKDAYS),
  start: z.string(),
  end: z.string(),
  place: z.string().nullable(),
});

const worldSchema = z.strictObject({
  asker: userSchema,
  askers: z.record(z.string(), userSchema),
  places: z.record(z.string(), z.string()),
  timetable: z.array(z.strictObject({ course: z.string(), meetings: z.array(meetingSchema).min(1) })),
  friends: z.record(z.string(), personSchema),
  lunchQuest: z.strictObject({
    title: z.string(),
    capacity: z.int().min(1).max(8),
    holders: z.array(z.string()).min(1),
    starts: timeSchema,
    ends: timeSchema,
    place: z.string(),
  }),
  globalEvents: z.array(
    z.strictObject({
      title: z.string(),
      description: z.string(),
      starts: timeSchema,
      ends: timeSchema,
      place: z.string(),
      point: z.strictObject({ latitude: z.number(), longitude: z.number() }),
    }),
  ),
});

export type P6WorldData = z.infer<typeof worldSchema>;
export type P6User = z.infer<typeof userSchema>;
export type P6Person = z.infer<typeof personSchema>;
export type TutorialProgressData = z.infer<typeof tutorialSchema>;

export const WORLD_FILE = new URL('world.yaml', import.meta.url);

export function p6WorldData(): P6WorldData {
  return worldSchema.parse(parse(readFileSync(WORLD_FILE, 'utf8')));
}
