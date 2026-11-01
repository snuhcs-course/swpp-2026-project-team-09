/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

// The three documents a User agrees to by signing in.
export const LEGAL_DOCUMENTS = {
  terms: '이용약관',
  privacy: '개인정보 처리방침',
  location: '위치정보 이용약관',
} as const;

export type LegalDocument = keyof typeof LEGAL_DOCUMENTS;

export function isLegalDocument(name: string): name is LegalDocument {
  return Object.hasOwn(LEGAL_DOCUMENTS, name);
}

export interface LegalSection {
  heading: string;
  paragraphs: readonly string[];
}

// The parts written so far. A document with none shows a placeholder until its text is written.
export const LEGAL_TEXTS: Partial<Record<LegalDocument, readonly LegalSection[]>> = {
  privacy: [
    {
      heading: '학번, 학적상 이름, 소속',
      paragraphs: [
        '내 정보에 학번, 학적상 이름(도서관에 등록된 이름), 소속(학부·대학원·교환학생)을 적을 수 있어요. 적지 않아도 다른 기능은 그대로 쓸 수 있어요.',
        '학번과 학적상 이름은 관정도서관 그룹 스터디룸을 예약할 때만 써요. 예약할 때마다 함께 예약하는 사람에게 보내도 될지 먼저 물어보고, 동의한 경우에만 그 예약을 하는 사람의 휴대폰으로 보내요.',
        '학번과 학적상 이름은 친구 목록, 친구 검색, 퀘스트, 파티, AI 어시스턴트 어디에도 보이지 않아요. 학적상 이름을 비워 두면 이름을 써요.',
        '소속은 나에게 맞는 새내기 튜토리얼과 열람실을 안내하는 데 써요. 다른 사람에게는 보이지 않아요.',
        '내 정보에서 지우면 SNU Now 서버에서도 지워져요.',
      ],
    },
    {
      heading: '도서관 로그인',
      paragraphs: [
        '도서관에는 도서관의 로그인 화면에서 직접 로그인해요. 비밀번호와 로그인 정보(세션)는 휴대폰에만 남고 SNU Now 서버로 보내지 않아요. SNU Now에서 로그아웃하면 지워져요.',
      ],
    },
  ],
};
