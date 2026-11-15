/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
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

const keySchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u, 'Expected a key in lowercase words joined by dashes');

// A Tutorial Category: one of the groups the quests are shown in, by its key, with the words the app shows.
const categorySchema = z.strictObject({ key: keySchema, label: text });

const questSchema = z.strictObject({
  key: keySchema,
  order: z.int().min(1),
  // The key of its Tutorial Category.
  category: keySchema.optional(),
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
  // The words 어시스턴트에게 예약 부탁하기 sends to the Assistant; the sheet shows the button only for a quest with them.
  ask: text.optional(),
  // What the Assistant answers from beyond the sheet's text, each with where it was read and when. GET /tutorial does
  // not serve them.
  facts: z.array(z.strictObject({ text, source: z.url({ protocol: /^https?$/u }), checked: z.iso.date() })).default([]),
});

type Quest = z.infer<typeof questSchema>;
type Issues = z.core.$RefinementCtx;

function refuseRepeats(quests: readonly Quest[], context: Issues): void {
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
}

// Every quest names a listed category, every category holds a quest, and each category's quests come one after
// another in `order`, so that the app shows them as a group. A file without `categories` has no quest with a
// `category`: the P6 suite's frozen copy (eval/p6/tutorial.yaml) is of that shape until it is revised.
function refuseCategoryMistakes(
  categories: readonly z.infer<typeof categorySchema>[],
  quests: readonly Quest[],
  context: Issues,
): void {
  const keys = categories.map(({ key }) => key);
  categories.forEach(({ key }, index) => {
    if (keys.indexOf(key) !== index) {
      context.addIssue({ code: 'custom', path: ['categories', index, 'key'], message: `Repeats the category ${key}` });
    }
  });
  quests.forEach(({ category }, index) => {
    if (categories.length === 0 ? category !== undefined : category === undefined || !keys.includes(category)) {
      context.addIssue({
        code: 'custom',
        path: ['quests', index, 'category'],
        message: `Names no category of \`categories\`: ${category ?? '(none)'}`,
      });
    }
  });
  const inOrder = quests.toSorted((a, b) => a.order - b.order).map(({ category }) => category);
  for (const key of keys) {
    const first = inOrder.indexOf(key);
    if (first === -1) {
      context.addIssue({ code: 'custom', path: ['categories'], message: `The category ${key} holds no quest` });
    } else if (inOrder.lastIndexOf(key) - first + 1 !== inOrder.filter((one) => one === key).length) {
      context.addIssue({
        code: 'custom',
        path: ['categories'],
        message: `The quests of the category ${key} are not one after another in \`order\``,
      });
    }
  }
}

const contentSchema = z
  .strictObject({ categories: z.array(categorySchema).default([]), quests: z.array(questSchema).min(1) })
  .superRefine(({ categories, quests }, context) => {
    refuseRepeats(quests, context);
    refuseCategoryMistakes(categories, quests, context);
  })
  .transform(({ categories, quests }) => ({ categories, quests: quests.toSorted((a, b) => a.order - b.order) }));

export type TutorialContent = z.infer<typeof contentSchema>;
export type TutorialQuest = TutorialContent['quests'][number];
export type TutorialPlace = TutorialQuest['places'][number];
export type TutorialCategory = TutorialContent['categories'][number];

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

// The switches the served content follows: LIBRARY_BOOKING_ENABLED and TUTORIAL_KWANJEONG_CHECK.
export interface TutorialSwitches {
  libraryBooking: boolean;
  kwanjeongCheck: boolean;
}

// The content as GET /tutorial serves it. A quest checked through the library is served as the file holds it only
// while both 관정 booking and the check are on; otherwise it is completed by its button, so that the phone never calls
// the library for it. With 관정 booking turned off, it also links to the official site, and no quest offers to ask
// the Assistant, which then cannot book.
export function servedContent(
  content: TutorialContent,
  { libraryBooking, kwanjeongCheck }: TutorialSwitches,
): TutorialContent {
  return {
    ...content,
    quests: content.quests.map((quest) => {
      const { ask: _ask, ...rest } = quest;
      const served = libraryBooking ? quest : rest;
      if (quest.completion.kind !== 'kwanjeongCheck' || (libraryBooking && kwanjeongCheck)) {
        return served;
      }
      return {
        ...served,
        completion: { kind: 'button' },
        links: libraryBooking ? quest.links : [...quest.links, KWANJEONG_SITE],
      };
    }),
  };
}
