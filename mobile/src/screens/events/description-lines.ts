/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

export interface DescriptionLine {
  words: string;
  // One or more blank lines come before it, which the sheet draws as one wider gap.
  afterBlank: boolean;
}

// The lines of an event's description, as scraped one per line of the page, without the blank ones. The words stay as
// the text has them.
export function descriptionLines(description: string): DescriptionLine[] {
  const lines: DescriptionLine[] = [];
  let afterBlank = false;
  for (const words of description.split(/\r?\n/u)) {
    if (words.trim() === '') {
      afterBlank = lines.length > 0;
      continue;
    }
    lines.push({ words, afterBlank });
    afterBlank = false;
  }
  return lines;
}
