/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-24  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { Redirect, useLocalSearchParams } from 'expo-router';
import type { ReactElement } from 'react';
import { isLegalDocument } from '@/screens/legal-documents';
import { LegalScreen } from '@/screens/legal-screen';

// A legal document's place: `/legal/terms`, `/legal/privacy` or `/legal/location`, and with `?part=` one of its parts,
// such as `/legal/privacy?part=error-reports`. Anyone may open it, signed in or not. Any other name leads to the start
// of the app.
export default function LegalRoute(): ReactElement {
  const { document, part } = useLocalSearchParams<{ document: string; part?: string }>();
  return isLegalDocument(document) ? <LegalScreen document={document} part={part} /> : <Redirect href="/" />;
}
