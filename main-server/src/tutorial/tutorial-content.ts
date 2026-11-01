/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { z } from 'zod';

// The tutorial's content (README.md: Tutorial). src/ and dist/ lie at the same depth below it.
export const TUTORIAL_FILE = fileURLToPath(new URL('../../content/tutorial.yaml', import.meta.url));

// The provider of the file's path, which a test overrides to serve another file.
export const TUTORIAL_FILE_PATH = 'TUTORIAL_FILE_PATH';

const text = z.string().trim().min(1);

const placeSchema = z.union([
  // A Place of the shared seed by its number, such as "62-1".
  z.strictObject({ place: text, floor: z.int().optional(), label: text.optional() }),
  z.strictObject({
    point: z.strictObject({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }),
    label: text,
  }),
]);

const completionSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('button') }),
  // The phone checks the User's library bookings; the skip completes the quest without the check.
  z.strictObject({ kind: z.literal('kwanjeongCheck'), skipLabel: text }),
]);

const questSchema = z.strictObject({
  key: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u, 'Expected a key in lowercase words joined by dashes'),
  order: z.int().min(1),
  title: text,
  // The pager's line.
  brief: text,
  // The sheet's text, a paragraph each.
  body: z.array(text).min(1),
  // 완료 조건.
  condition: text,
  completion: completionSchema,
  completionMessage: text,
  places: z.array(placeSchema),
  links: z.array(z.strictObject({ label: text, url: z.url({ protocol: /^https?$/u }) })),
  // What the Assistant answers from beyond the sheet's text, each with where it was read and when. GET /tutorial does
  // not serve them.
  facts: z.array(z.strictObject({ text, source: z.url({ protocol: /^https?$/u }), checked: z.iso.date() })).default([]),
});

const contentSchema = z
  .strictObject({ quests: z.array(questSchema).min(1) })
  .superRefine(({ quests }, context) => {
    for (const field of ['key', 'order'] as const) {
      const seen = new Set<string | number>();
      quests.forEach((quest, index) => {
        if (seen.has(quest[field])) {
          context.addIssue({
            code: 'custom',
            path: ['quests', index, field],
            message: `Repeats the ${field} ${quest[field]}`,
          });
        }
        seen.add(quest[field]);
      });
    }
  })
  .transform(({ quests }) => ({ quests: quests.toSorted((a, b) => a.order - b.order) }));

export type TutorialContent = z.infer<typeof contentSchema>;
export type TutorialQuest = TutorialContent['quests'][number];
export type TutorialPlace = TutorialQuest['places'][number];

// Read once when the server starts. A file that does not parse or does not match stops the start with the reason.
export async function readTutorialContent(file: string): Promise<TutorialContent> {
  const result = contentSchema.safeParse(parse(await readFile(file, 'utf8')));
  if (!result.success) {
    throw new Error(`${file} is not a valid tutorial: ${z.prettifyError(result.error)}`);
  }
  return result.data;
}

// The official booking site, which the 관정 quest links to when booking in the app is turned off.
export const KWANJEONG_SITE = {
  label: '관정도서관 예약 사이트',
  url: 'https://k-rsv.snu.ac.kr/NEW_SNU_BOOKING/pc/main',
};

// The content as GET /tutorial serves it. With 관정 booking turned off (LIBRARY_BOOKING_ENABLED), a quest checked
// through the library is completed by its button instead, so that the phone never calls the library for it, and links
// to the official site.
export function servedContent(content: TutorialContent, libraryBooking: boolean): TutorialContent {
  if (libraryBooking) {
    return content;
  }
  return {
    quests: content.quests.map((quest) =>
      quest.completion.kind === 'kwanjeongCheck'
        ? { ...quest, completion: { kind: 'button' }, links: [...quest.links, KWANJEONG_SITE] }
        : quest,
    ),
  };
}
