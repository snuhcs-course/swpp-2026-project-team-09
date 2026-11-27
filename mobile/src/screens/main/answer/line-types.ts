/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { TextStyle } from 'react-native';
import { color, text } from '@/design-system';

// The three kinds of line a card says, each in one type wherever it stands (P01 ticket 19).

// The answer's sentence, in the meal frame's settled type: the model's words, and every line that stands in their
// place, such as the server's lines of an answer, a refusal's first line, or a library card's outcome.
export const SENTENCE: TextStyle = { ...text.bodyLg, color: color.ink };

// A note under it: a refusal's second line, a failure's explanation.
export const NOTE: TextStyle = { ...text.body, color: color.inkMuted };

// A failure, in red, in every card and sheet: a library card's, a request's, the leave row's, an invitation's.
export const FAILURE: TextStyle = { ...text.body, color: color.danger };
