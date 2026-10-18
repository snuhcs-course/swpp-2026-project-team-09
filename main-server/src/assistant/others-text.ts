/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

// Text that other people wrote or that was collected from a Source, such as a Global Event's description or a Quest's
// title, as a tool gives it to the model: inside labelled delimiters, which the system prompt marks as data, never
// instructions. Every tool that returns such text wraps it here, so that the model sees one form.

// The opening and closing tags, as the system prompt names them.
export const DELIMITER = { open: '<data label="…">', close: '</data>' } as const;

// A tag of the delimiters written inside the text, which would end the data early.
const TAG = /<(\/?)data/giu;

// What a label may be: `globalEvent.title`, `quest.description`.
const LABEL = /^[A-Za-z]+(?:\.[A-Za-z]+)*$/u;

// The text inside the delimiters, labelled with what it is. A tag of the delimiters inside it is broken, so that the
// text cannot close them and write outside.
export function othersText(label: string, text: string): string {
  if (!LABEL.test(label)) {
    throw new Error(`A label of others' text is words and dots, not ${label}`);
  }
  return `<data label="${label}">${text.replaceAll(TAG, '<$1_data')}</data>`;
}
