// AI-generated with Claude Opus 5.5, 2026-10-05, prompted by AhnJinYoung
import { Redirect, useLocalSearchParams } from 'expo-router';
import type { ReactElement } from 'react';
import { isLegalDocument } from '@/screens/legal-documents';
import { LegalScreen } from '@/screens/legal-screen';

// A legal document's place: `/legal/terms`, `/legal/privacy` or `/legal/location`. Anyone may open it, signed in or
// not. Any other name leads to the start of the app.
export default function LegalRoute(): ReactElement {
  const { document } = useLocalSearchParams<{ document: string }>();
  return isLegalDocument(document) ? <LegalScreen document={document} /> : <Redirect href="/" />;
}
