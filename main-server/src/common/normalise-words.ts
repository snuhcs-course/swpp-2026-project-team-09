/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// The one key words are matched, stored and looked up by (P07): NFC, lower case and every whitespace removed, so that
// 학 관, 학관 and a 학관 typed as separate jamo are one key, and so are SK경영관 and sk경영관.
export function normaliseWords(text: string): string {
  return text.normalize('NFC').toLowerCase().replaceAll(/\s/gu, '');
}
