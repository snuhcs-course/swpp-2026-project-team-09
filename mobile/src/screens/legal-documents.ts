/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-24  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-25  Fable 5.2  prompted by AhnJinYoung
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-27  Opus 5.5   prompted by AhnJinYoung
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
  // A name by which a link opens the document at this part: `/legal/privacy?part=error-reports`.
  part?: string;
}

// The privacy policy's part on error reports (P08), which the switch "오류 보고 보내기" in 내 정보 opens.
export const ERROR_REPORTS_PART = 'error-reports';
export const ERROR_REPORTS_HEADING = '오류 보고';

// The privacy policy's part on usage data (P08 ticket 11), which the consent screen's item and the switch "사용 기록
// 보내기" in 내 정보 open.
export const USAGE_PART = 'usage';
export const USAGE_HEADING = '사용 기록';

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
        '도서관에는 도서관의 로그인 화면에서 직접 로그인해요. 비밀번호는 SNU Now가 볼 수 없고, 로그인 정보(세션)는 휴대폰에만 남아요. 세션은 SNU Now 서버로 보내지 않고, SNU Now에서 로그아웃하면 지워져요.',
      ],
    },
    {
      heading: ERROR_REPORTS_HEADING,
      part: ERROR_REPORTS_PART,
      paragraphs: [
        '앱에 오류가 나거나 앱이 멈추면, 그 오류를 찾아 고치기 위해 오류 보고를 보내요.',
        '오류 보고에는 오류의 내용(오류 메시지는 200자까지)과 앱 코드에서 오류가 난 곳, 그때까지 본 화면의 이름과 앱이 서버에 보낸 요청의 종류·결과(둘 다 주소에서 id를 지운 것), 앱의 버전과 업데이트, 휴대폰의 기종과 OS 버전, 계정의 내부 id가 담겨요. 내부 id는 SNU Now가 정한 무작위 값이고, 이름·이메일·학번이 아니에요.',
        '오류 보고 보내기가 켜져 있는 동안에는 앱을 연 횟수와 오류 없이 끝났는지도 함께 보내요. 오류가 얼마나 자주 나는지 알기 위해서예요.',
        '이름, 이메일, 학번, 위치, 친구, 파티 제목은 보내지 않아요. 입력한 내용도 따로 보내지 않지만, 오류 메시지에 입력한 내용이 섞여 있으면 그 부분이 함께 담길 수 있어요.',
        '앱의 네이티브 부분이 멈춘 경우에는 휴대폰의 오류 보고 기능이 SNU Now가 내용을 거르는 단계를 거치지 않고 그대로 보내요. 여기에도 같은 종류의 정보(코드에서 멈춘 곳, 기기, OS)가 담겨요.',
        '오류 보고는 Functional Software, Inc.(Sentry)가 받아 미국에 있는 서버에 보관해요(개인정보의 국외 이전). 보관 기간은 최대 90일이고, 그 기간이 지나면 Sentry가 지워요.',
        '오류 보고 보내기는 처음에 켜져 있어요. 내 정보 › 오류 보고 보내기에서 언제든 끌 수 있고, 꺼 두는 동안에는 아무것도 보내지 않아요. 켜져 있을 때 휴대폰에 남은 오류 기록은 다시 켤 때에만 보내요.',
      ],
    },
    {
      heading: USAGE_HEADING,
      part: USAGE_PART,
      paragraphs: [
        "SNU Now를 어떻게 쓰는지 알고 고치기 위해, '사용 기록 보내기'를 켠 경우에만 사용 기록을 보내요.",
        '사용 기록에는 앱을 연 때, 연 화면의 이름(주소에서 id를 지운 것), 그리고 다음 기능을 요청한 때와 그 결과(완료, 또는 실패와 그 이유)가 담겨요: AI 어시스턴트에게 질문해 답을 받은 것, 파티를 만든 것(공개·비공개만), 파티에 참여한 것(초대 수락·바로 참여·참여 신청 수락 중 어느 것인지), 친구가 된 것(친구 신청 수락·초대 링크 수락 중 어느 것인지), 관정도서관 좌석을 예약한 것. 앱이 서버에 보낸 요청이 실패하면 그 요청의 종류(주소에서 id를 지운 것)와 실패 이유도 담겨요.',
        'SNU Now 서버도 AI 어시스턴트의 답, 파티 만들기, 파티 참여, 친구 맺기를 마치면 그 사실을 같은 방식으로 보내요.',
        '함께 담기는 것은 계정의 내부 id, 앱의 이름·버전·빌드 번호, 휴대폰의 제조사·기종·OS 버전·화면 크기, 그리고 앱을 한 번 쓰는 동안의 무작위 세션 번호예요. 내부 id는 SNU Now가 정한 무작위 값이고, 이름·이메일·학번이 아니에요.',
        '이름, 이메일, 학번, 위치, 친구 목록, 파티 제목, 장소, AI 어시스턴트에게 쓴 말과 그 답, 그 밖에 입력한 내용은 보내지 않아요. IP 주소도 남기지 않아요.',
        '사용 기록은 PostHog, Inc.가 받아 미국(버지니아)에 있는 서버에 보관해요(개인정보의 국외 이전). 앱을 쓰는 동안 인터넷으로 그때그때 보내요. 보관 기간은 1년이고, 그 기간이 지나면 PostHog가 지워요.',
        '사용 기록 보내기는 선택이에요. 고르지 않아도 모든 기능을 그대로 쓸 수 있어요. 처음 동의할 때 고르고, 그 뒤에도 내 정보 › 사용 기록 보내기에서 언제든 켜고 끌 수 있어요. 고르기 전과 꺼 두는 동안에는 아무것도 보내지 않아요. 이미 보낸 사용 기록은 끈 뒤에도 보관 기간이 끝날 때까지 PostHog에 남고, 그 뒤에 지워져요.',
      ],
    },
  ],
};
