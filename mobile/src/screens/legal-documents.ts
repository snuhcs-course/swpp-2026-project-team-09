// The three documents a User agrees to by signing in. Their texts are not written yet.
export const LEGAL_DOCUMENTS = {
  terms: '이용약관',
  privacy: '개인정보 처리방침',
  location: '위치정보 이용약관',
} as const;

export type LegalDocument = keyof typeof LEGAL_DOCUMENTS;

export function isLegalDocument(name: string): name is LegalDocument {
  return Object.hasOwn(LEGAL_DOCUMENTS, name);
}
