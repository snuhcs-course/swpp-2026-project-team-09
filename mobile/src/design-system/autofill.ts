/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { TextInputProps } from 'react-native';

// Every text field of the app takes these first. None of them asks for a credential, so Android's autofill must
// neither fill them nor offer to save what is typed there: once it wrote the library login's saved ID into the AI
// input. The library login's own fields are the web page's, inside the web view, and the password manager still
// fills those.
export const NOT_AUTOFILLED = {
  autoComplete: 'off',
  importantForAutofill: 'no',
  textContentType: 'none',
} as const satisfies Pick<TextInputProps, 'autoComplete' | 'importantForAutofill' | 'textContentType'>;
