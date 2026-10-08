import { type JoinPolicy, type QuestBoard } from '../generated/prisma/client.js';
import { type DemoTime } from './demo-data.js';

export interface DemoSubQuest {
  title: string;
  place: string;
  startsAt: DemoTime;
  endsAt: DemoTime;
}

export interface DemoQuest {
  key: string;
  title: string;
  description: string;
  board: QuestBoard;
  joinPolicy: JoinPolicy;
  capacity: number;
  // The Leader first, then the other Holders in the order they entered.
  holders: string[];
  // A Quest for a Global Event has its attending Sub Quest first.
  globalEvent?: string;
  subQuests: DemoSubQuest[];
}

export const DEMO_QUESTS: DemoQuest[] = [
  {
    key: 'meal-open',
    title: '학관에서 같이 밥 먹어요',
    description: '학생회관 식당에서 같이 먹을 사람 구해요. 편하게 오세요!',
    board: 'meal',
    joinPolicy: 'open',
    capacity: 4,
    holders: ['jiho', 'minjun'],
    subQuests: [{ title: '학관 식당', place: '63', startsAt: { hours: 1 }, endsAt: { hours: 2 } }],
  },
  {
    key: 'meal-approval',
    title: '서당골에서 저녁',
    description: '서당골 저녁 같이 드실 분, 신청해 주시면 확인할게요.',
    board: 'meal',
    joinPolicy: 'approval',
    capacity: 3,
    holders: ['sua'],
    subQuests: [{ title: '서당골 저녁', place: '76', startsAt: { hours: 4 }, endsAt: { hours: 5 } }],
  },
  {
    key: 'career-open',
    title: '개발자 진로 이야기',
    description: '특강 듣고 이야기 나눠요. 진로 고민 있는 분 누구나.',
    board: 'career',
    joinPolicy: 'open',
    capacity: 6,
    holders: ['doyun'],
    subQuests: [
      { title: '특강 후 이야기', place: '302', startsAt: { hours: 2 }, endsAt: { hours: 3 } },
      {
        title: '포트폴리오 같이 보기',
        place: '38',
        startsAt: { days: 2, at: '18:00' },
        endsAt: { days: 2, at: '19:30' },
      },
    ],
  },
  {
    key: 'career-approval',
    title: '인턴 자소서 같이 봐요',
    description: '서로 자기소개서를 읽고 고쳐 줘요. 신청 받아요.',
    board: 'career',
    joinPolicy: 'approval',
    capacity: 4,
    holders: ['seoyeon', 'sua'],
    subQuests: [
      { title: '자소서 첨삭', place: '83', startsAt: { days: 1, at: '15:00' }, endsAt: { days: 1, at: '17:00' } },
    ],
  },
  {
    key: 'hobby-open',
    title: '중도에서 같이 공부해요',
    description: '중앙도서관에서 각자 공부하고 쉬는 시간에 같이 쉬어요.',
    board: 'hobby',
    joinPolicy: 'open',
    capacity: 5,
    holders: ['minjun', 'seoyeon'],
    subQuests: [
      { title: '도서관 공부', place: '62', startsAt: { hours: -0.5 }, endsAt: { hours: 2.5 } },
      { title: '쉬는 시간 산책', place: '63', startsAt: { hours: 2.5 }, endsAt: { hours: 3 } },
    ],
  },
  {
    key: 'hobby-approval',
    title: '체육관 배드민턴',
    description: '배드민턴 복식 칠 사람 구해요. 라켓은 빌려드려요.',
    board: 'hobby',
    joinPolicy: 'approval',
    capacity: 4,
    holders: ['jiho'],
    subQuests: [
      { title: '배드민턴', place: '71', startsAt: { days: 1, at: '18:00' }, endsAt: { days: 1, at: '20:00' } },
    ],
  },
  {
    key: 'show-open',
    title: '가을 음악회 같이 가요',
    description: '음악회 같이 듣고 끝나고 카페 가요.',
    board: 'show',
    joinPolicy: 'open',
    capacity: 4,
    holders: ['jiyu', 'haeun'],
    globalEvent: 'autumn-concert',
    subQuests: [{ title: '끝나고 카페', place: '63', startsAt: { hours: 5 }, endsAt: { hours: 6 } }],
  },
  {
    key: 'show-approval',
    title: '밴드 공연 앞자리 같이',
    description: '밴드 공연 일찍 가서 앞자리 잡을 분 신청해 주세요.',
    board: 'show',
    joinPolicy: 'approval',
    capacity: 3,
    holders: ['haeun'],
    globalEvent: 'band-show',
    subQuests: [],
  },
];
