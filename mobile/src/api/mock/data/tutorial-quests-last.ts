/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { TutorialContent } from './tutorial';

// The quests of 이동, 건강 and 문화·여가 in `main-server/content/tutorial.yaml`, in `order`, for the mock's `TUTORIAL_CONTENT`.
export const LAST_QUESTS: readonly TutorialContent[] = [
  {
    key: 'admin-shuttle',
    order: 9,
    category: 'transit',
    title: '행정관 셔틀 이용하기',
    brief: '행정관 앞에서 셔틀을 타 보세요.',
    body: [
      "행정관 셔틀은 행정관 잔디광장 아래 정류장에서 타요. 카카오맵에서 '메가커피'를 검색하면 정류장을 찾기 쉬워요.",
      '셔틀 대신 5511, 5513, 5516번 버스를 타도 돼요.',
    ],
    condition: '행정관 셔틀 타 보기',
    completion: { kind: 'button' },
    completionMessage: '셔틀 타 보니 어떠셨나요? 캠퍼스 이동이 한결 편해질 거예요!',
    places: [
      { point: { latitude: 37.460938, longitude: 126.950312 }, label: '행정관 셔틀 정류장 (행정관 잔디광장 아래)' },
    ],
    links: [],
  },
  {
    key: 'night-shuttle',
    order: 10,
    category: 'transit',
    title: '야간 셔틀 타기',
    brief: '밤늦게까지 공부한 날에도 셔틀을 타고 집에 갈 수 있어요.',
    body: [
      '밤에는 셔틀이 두 가지 있어요.',
      '· 야간 도서관 셔틀(탈출셔틀): 연중 21:10, 21:40, 22:10, 22:40, 23:10에 행정관 앞에서 서울대입구역과 대학동으로 바로 가요.',
      '· 심야셔틀: 학기 중 24:00–02:00에 30분 간격으로 에너지자원신기술연구소에서 출발해 교내를 돌고 낙성대(인헌초)를 거쳐 서울대입구역 3번 출구까지 가요.',
      '· 2026년 시험기간(10/12–10/30, 11/30–12/14, 주말·공휴일 제외)에는 심야셔틀이 302동에서 23:40, 00:15, 00:50, 01:25, 02:00에 출발하고, 서울대입구역행 도서관 셔틀이 2대에서 3대로 늘어요.',
    ],
    condition: '야간 도서관 셔틀이나 심야셔틀 타 보기',
    completion: { kind: 'button' },
    completionMessage: '늦은 밤에도 안전하게 돌아가셨나요? 오늘도 수고 많았어요!',
    places: [
      { point: { latitude: 37.460938, longitude: 126.950312 }, label: '행정관 앞 (야간 도서관 셔틀)' },
      { place: '302', label: '제2공학관(302동) (시험기간 심야셔틀)' },
    ],
    links: [
      { label: '셔틀버스 노선 및 시간', url: 'https://www.snu.ac.kr/about/gwanak/shuttles/shuttle_stops' },
      {
        label: '시험기간 셔틀 증차 및 심야셔틀 노선 변경 안내 (컴퓨터공학부 공지)',
        url: 'https://cse.snu.ac.kr/ko/community/notice/25702',
      },
    ],
  },
  {
    key: 'health-clinic',
    order: 11,
    category: 'health',
    title: '서울대 보건진료소 이용',
    brief: '보건진료소가 어디 있는지 알아 두세요.',
    body: [
      '서울대 보건진료소는 학생회관(63동) 3–4층에 있어요. 진료는 3층에서 하고, 접수와 수납은 329호에서 해요. 진료 시간과 이용 방법은 보건진료소 홈페이지에서 확인할 수 있어요.',
    ],
    condition: '보건진료소 위치와 이용 방법 확인하기',
    completion: { kind: 'button' },
    completionMessage: '아플 땐 참지 말고 보건진료소를 찾아 주세요!',
    places: [{ place: '63', floor: 3 }],
    links: [
      { label: '보건진료소 홈페이지', url: 'https://health4u.snu.ac.kr/index.do' },
      { label: '진료 시간표', url: 'https://health4u.snu.ac.kr/medicalTreatment/PracticeSchedule/_/view.do' },
      { label: '오시는 길', url: 'https://health4u.snu.ac.kr/operation/guide/_/view.do' },
      { label: '이용 절차', url: 'https://health4u.snu.ac.kr/operation/useProcedure/_/view.do' },
      { label: '진료 예약', url: 'https://health4u.snu.ac.kr/medicalTreatment/newAppointment/_/init.do' },
    ],
  },
  {
    key: 'counseling-center',
    order: 12,
    category: 'health',
    title: '대학생활문화원 상담 알아두기',
    brief: '마음이 힘들 때 이야기할 수 있는 곳을 알아 두세요.',
    body: [
      '대학생활문화원은 학생회관(63동) 5층에 있어요. 학교생활이나 마음이 힘들 때 상담을 받을 수 있어요.',
      '· 개인상담은 신청하고 접수면접(신청서와 심리검사)을 거친 뒤 상담자가 정해지면, 주 1회 50분 대면으로 해요.',
      '· 24시간 위기상담전화 스누콜: (02) 880-8080',
    ],
    condition: '대학생활문화원 위치와 스누콜 번호 확인하기',
    completion: { kind: 'button' },
    completionMessage: '혼자 버티지 않아도 돼요. 언제든 도움을 요청하세요.',
    places: [{ place: '63', floor: 5 }],
    links: [{ label: '대학생활문화원 프로그램 안내', url: 'https://www.snu.ac.kr/campuslife/aid/programs' }],
  },
  {
    key: 'art-museum',
    order: 13,
    category: 'culture',
    title: '서울대 미술관/파워플랜트 관람',
    brief: '캠퍼스 안의 미술관과 파워플랜트에서 전시를 봐요.',
    body: [
      '서울대학교 미술관(151동)과 파워플랜트(68동)에서 전시를 볼 수 있어요. 지금 하는 전시는 각 홈페이지에서 확인해 보세요.',
    ],
    condition: '미술관이나 파워플랜트 전시 관람하기',
    completion: { kind: 'button' },
    completionMessage: '전시는 즐거우셨나요? 캠퍼스 곳곳의 문화 공간을 자주 찾아 보세요!',
    places: [{ place: '151' }, { place: '68' }],
    links: [
      { label: '서울대학교 미술관', url: 'http://www.snumoa.org/' },
      { label: '파워플랜트', url: 'https://culture.snu.ac.kr/event/powerplant365/' },
    ],
  },
  {
    key: 'dure-practice-room',
    order: 14,
    category: 'culture',
    title: '두레문예관 연습실 예약하기',
    brief: '동아리가 아니어도 혼자 악기나 춤을 연습할 방을 빌릴 수 있어요.',
    body: [
      'NH농협두레문예관(67동)에는 연습실 7개 호실이 있어요. 동아리뿐 아니라 재학생 개인도 예약할 수 있어요.',
      '· 예약하샤에서 빈 호실을 찾아 신청하면 두레운영실이 검토하고, 결과를 이메일로 보내요. 승인까지 1–3일 걸려요.',
      '· 개인은 15일 안의 날짜를 한 번에 3시간까지 예약할 수 있어요. 사용 당일 예약은 승인되지 않아요.',
    ],
    condition: '두레문예관 연습실 예약 방법 확인하기',
    completion: { kind: 'button' },
    completionMessage: '마음껏 연습할 공간이 생겼어요. 즐겁게 연습하세요!',
    places: [{ place: '67' }],
    links: [
      {
        label: '학생처 연습실 안내',
        url: 'https://student.snu.ac.kr/%eb%8c%80%ed%95%99%ec%83%9d%ed%99%9c/%eb%ac%b8%ed%99%94%c2%b7%ec%98%88%ec%88%a0/%ec%97%b0%ec%8a%b5%ec%8b%a4/',
      },
    ],
  },
  {
    key: 'gwanaksan-engineering-trail',
    order: 15,
    category: 'culture',
    title: '공학관 코스로 관악산 오르기',
    brief: '캠퍼스에서 바로 관악산 정상 연주대까지 올라 보세요.',
    body: [
      '공대 위 건설환경종합연구소에서 도림천계곡을 따라 관악산 정상 연주대까지 오를 수 있어요. 서울등산관광센터는 이 길(연주대 A코스)을 연주대에 오르는 가장 짧고 쉬운 코스로 안내해요.',
      '· 등산로 입구는 5513번 버스의 건설환경종합연구소 정류장 바로 옆이에요.',
      '· 산길이니 편한 신발을 신고, 해가 지기 전에 내려오세요.',
    ],
    condition: '연주대까지 올라 보기',
    completion: { kind: 'button' },
    completionMessage: '정상에서 본 캠퍼스는 어땠나요? 수고 많았어요!',
    places: [
      { point: { latitude: 37.4472146, longitude: 126.9498331 }, label: '등산로 입구 (건설환경종합연구소 정류장)' },
      { point: { latitude: 37.4447713, longitude: 126.9645611 }, label: '연주대 (관악산 정상)' },
    ],
    links: [
      {
        label: '관악산 등산 코스 (서울등산관광센터)',
        url: 'https://seoulhiking.or.kr/theme/basic/img/mountain_gwanaksan-kr.pdf',
      },
    ],
  },
];
