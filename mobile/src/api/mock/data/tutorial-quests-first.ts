/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-28  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { TutorialContent } from './tutorial';

// The quests of 생활 and 공부·학사 in `main-server/content/tutorial.yaml`, in `order`, for the mock's `TUTORIAL_CONTENT`.
export const FIRST_QUESTS: readonly TutorialContent[] = [
  {
    key: 's-card',
    order: 1,
    category: 'life',
    title: '학생증(S-CARD) 발급받기',
    brief: '학생증(S-CARD)을 신청하고 받아 보세요.',
    body: [
      '학생증(S-CARD)은 도서관 출입처럼 학교생활 곳곳에서 써요.',
      '· 신청: MySNU에서 온라인으로 신청해요.',
      '· 수령: 신청한 다음 날부터 학생지원센터(67동 NH농협두레문예관 2층)에서 받아요. 평일 9:00–17:50에 열어요.',
      '· 금융 기능이 있는 학생증은 우리은행(4동)에서 처리해요. 교환학생은 금융 학생증을 받을 수 없어요.',
      "· 모바일 학생증은 '서울대학교' 앱에서 쓸 수 있어요.",
    ],
    condition: '학생증 받기',
    completion: { kind: 'button' },
    completionMessage: '학생증을 받았군요! 이제 도서관과 학교 시설을 마음껏 이용해 보세요.',
    places: [
      { place: '67', floor: 2 },
      { place: '4', label: '우리은행 (4동)' },
    ],
    links: [
      { label: 'MySNU', url: 'https://my.snu.ac.kr' },
      {
        label: '학생처 S-CARD 발급 절차',
        url: 'https://student.snu.ac.kr/%eb%8c%80%ed%95%99%ec%83%9d%ed%99%9c/%ea%b8%b0%ed%83%80/s-card/%eb%b0%9c%ea%b8%89-%ec%a0%88%ec%b0%a8/',
      },
    ],
  },
  {
    key: 'thousand-won-meals',
    order: 2,
    category: 'life',
    title: '천원의 식사 이용하기',
    brief: '아침만이 아니라 점심과 저녁도 1,000원에 먹을 수 있어요.',
    body: ['아침·점심·저녁, 1,000원에 먹을 수 있어요.', '윗공대(301동)는 아침만 운영해요.'],
    condition: '천원의 식사로 한 끼 먹어 보기',
    completion: { kind: 'button' },
    completionMessage: '든든하게 드셨나요? 바쁜 날에도 끼니는 꼭 챙겨요!',
    places: [{ place: '63' }, { place: '301', label: '윗공대 301동 · 아침만' }],
    links: [
      {
        label: '학생처 천원의 식샤 안내',
        url: 'https://student.snu.ac.kr/%eb%8c%80%ed%95%99%ec%83%9d%ed%99%9c/%ec%8b%9d%ec%83%9d%ed%99%9c/%ec%b2%9c%ec%9b%90%ec%9d%98%ec%8b%9d%ec%83%a4/',
      },
      { label: '서울대학교 생활협동조합', url: 'https://snuco.snu.ac.kr/' },
    ],
  },
  {
    key: 'lost-and-found',
    order: 3,
    category: 'life',
    title: '분실물센터 위치 알아두기',
    brief: '물건을 잃어버리면 찾아갈 교내 분실물센터를 알아 두세요.',
    body: [
      '교내 분실물센터는 아시아연구소(101동) 1층, 국민은행 옆에 있어요. 캠퍼스안전반이 운영해요.',
      '· 운영 시간: 09:00–18:00 · 전화: 02-880-8114',
      '· 찾아갈 때는 서약서를 쓰고, 잃어버린 곳과 때를 확인해요. 신분증이나 학생증은 본인인지 대조해요.',
      '· 1개월 동안 보관한 뒤에는 경찰청 유실물센터와 관악경찰서로 넘어가요.',
    ],
    condition: '분실물센터 위치 확인하기',
    completion: { kind: 'button' },
    completionMessage: '이제 물건을 잃어버려도 어디로 가야 할지 알겠죠?',
    places: [{ place: '101', floor: 1 }],
    links: [
      {
        label: '학생처 분실물센터 안내',
        url: 'https://student.snu.ac.kr/%EC%86%8C%EC%8B%9D%C2%B7%EC%95%8C%EB%A6%BC/%EA%B3%B5%EC%A7%80%EC%82%AC%ED%95%AD/?mod=document&uid=153',
      },
    ],
  },
  {
    key: 'laptop-rental',
    order: 4,
    category: 'life',
    title: '노트북 대여 서비스 알아두기',
    brief: '노트북이 고장 나도 걱정 마세요. 정보화본부에서 하루 1,000원에 빌릴 수 있어요.',
    body: [
      '정보화본부(102동) 101호 IT Service Center에서 학생은 노트북을 하루 1,000원에 빌릴 수 있어요.',
      '· 신청: 마이스누 → 캠퍼스·복지 → IT서비스 → 장비/SW대여 → 장비신청',
      '· 대여와 반납은 평일 09:00–18:00에만 돼요. 주말과 공휴일에는 안 돼요.',
      '· 늦게 반납하면 하루에 대여료의 2배를 연체료로 내요.',
    ],
    condition: '노트북 대여 방법 확인하기',
    completion: { kind: 'button' },
    completionMessage: '급할 때 노트북을 빌릴 곳이 생겼어요!',
    places: [{ place: '102', label: '정보화본부(102동) 101호' }],
    links: [
      {
        label: '정보화본부 전산장비 대여',
        url: 'https://ist.snu.ac.kr/%ec%a0%84%ec%82%b0%ec%9e%a5%eb%b9%84%eb%8c%80%ec%97%ac/',
      },
    ],
  },
  {
    key: 'kwanjeong',
    order: 5,
    category: 'study',
    title: '관정도서관 예약하기',
    brief: '관정도서관 열람실을 예약하고 이용해 보세요.',
    body: [
      '관정도서관은 관정도서관 내부 키오스크에 로그인한 후 좌석을 예약하거나, 관정도서관 공식 앱, 또는 이 SNU Now에서 어시스턴트에게 부탁해 예약을 진행할 수 있어요. 이번 튜토리얼에서는 관정도서관을 이용해보세요!',
      '열람실 좌석은 예약한 뒤 30분 안에 좌석배정기(키오스크)에서 확인해야 해요. 확인하지 않으면 자동으로 반납돼요.',
      '확인하지 않거나 반납하지 않은 일이 한 달에 5번이면 10일 동안 예약할 수 없어요. 그룹스터디룸은 1시간 안에 들어가지 않으면 취소되고, 7일에 3번이면 3일 동안 예약할 수 없어요.',
      '사용 다했으면 꼭 반납처리를 해주세요! 저한테 말해주셔도 되고 키오스크를 이용해 반납하셔도 돼요!',
    ],
    condition: '관정도서관 열람실이나 스터디룸 예약 및 이용',
    completion: { kind: 'kwanjeongCheck', skipLabel: '이미 예약 및 이용해본 적이 있어요' },
    ask: '관정도서관 7층 열람실에 한 자리 예약해줘',
    completionMessage: '관정도서관 이용은 어떠셨나요? 도서관을 자주 이용해 보아요!',
    places: [{ place: '62-1' }],
    links: [],
  },
];
