/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

// Why a call failed. `noSession` is a call made with no library login at all.
export type LibraryFailure = 'sessionEnded' | 'network' | 'notAllowed' | 'noSession';

// The error a failed call throws. It names the kind and the endpoint only, never a form field or a reply, so that
// nothing of the library reaches a log or an error report.
export class LibraryError extends Error {
  readonly kind: LibraryFailure;
  readonly endpoint: string | null;

  constructor(kind: LibraryFailure, endpoint: string | null) {
    super(`The library call ${endpoint ?? ''} failed: ${kind}`);
    this.name = 'LibraryError';
    this.kind = kind;
    this.endpoint = endpoint;
  }
}

export function isLibraryError(error: unknown): error is LibraryError {
  return error instanceof LibraryError;
}

// What a card says for each failure.
export const LIBRARY_FAILURE_TEXT: Readonly<Record<LibraryFailure, string>> = {
  sessionEnded: '관정도서관 로그인이 끝났어요. 다시 로그인해 주세요.',
  noSession: '관정도서관 로그인이 필요해요',
  network: '도서관 서버에 연결하지 못했어요. 잠시 후 다시 해 주세요.',
  notAllowed: '예약하지 못했어요',
};
