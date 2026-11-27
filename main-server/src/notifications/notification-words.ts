/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-19  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { clockOf } from '../assistant/free-time/free-time.js';
import { withCopula, withSubject } from '../assistant/gathering/answer-words.js';
import { koreaDate } from '../assistant/korea-time.js';
import { clockOfMinutes, minutesOfClock } from '../assistant/library/booking-rules.js';
import { monthDayWords, weekdayWord } from '../assistant/library/study-room.js';
import { type GoneKind, type NotificationWords, type PartyGone, type Told } from './notification.js';

const ANSWERS = { accepted: '수락했어요', declined: '못 온대요' } as const;

type Of<Kind extends Told['kind']> = Extract<Told, { kind: Kind }>;

// "목 15:30–18:30".
function timesWords({ date, start, minutes }: { date: string; start: string; minutes: number }): string {
  return `${weekdayWord(date)} ${start}–${clockOfMinutes(minutesOfClock(start) + minutes)}`;
}

// A room request's Notifications ring, with the line as the push's body.
function roomWords(told: Of<'room-declined'> | Of<'room-agreed'> | Of<'room-ending'>): NotificationWords {
  const card = { kind: 'party', id: told.questId };
  if (told.kind === 'room-declined') {
    const plan = told.moreNeeded > 0 ? `${String(told.moreNeeded)}명 더 필요해요` : '계획은 그대로예요';
    const line = `${told.roomLabel} · ${plan}`;
    return {
      title: `${withSubject(told.friendName)} 못 온대요`,
      ahead: null,
      line,
      card,
      about: told.friendId,
      rings: true,
      body: `${line}.`,
    };
  }
  if (told.kind === 'room-agreed') {
    const line = `${timesWords(told)} ${told.roomLabel}`;
    return {
      title: '모두 동의했어요',
      ahead: null,
      line,
      card,
      about: null,
      rings: true,
      body: `${line}, 이제 예약할 수 있어요.`,
    };
  }
  const line = `${told.roomLabel} · ${told.end}에 끝나요`;
  return {
    title: '10분 뒤 끝나요',
    ahead: `${told.end} 방 예약 끝`,
    line,
    card,
    about: null,
    rings: true,
    body: `${line}.`,
  };
}

// The push's body of a new match: the line as a sentence, or why it rang when neither the start nor the Place is known.
// "걸어서 15분", or "셔틀로 18분".
function wayWords({ walkMinutes, by }: Of<'leave-by'>): string {
  return `${by === 'shuttle' ? '셔틀로' : '걸어서'} ${String(walkMinutes)}분`;
}

// " 13:00 수업에 맞아요.", after a leave-by's walk when it says what the walk is for.
function towardWords(toward: Of<'leave-by'>['toward']): string {
  return toward === undefined ? '' : ` ${toward.start} ${toward.word}에 맞아요.`;
}

function interestBody(time: string | null, placeLabel: string | null): string {
  if (placeLabel !== null) {
    return `${withCopula(time === null ? placeLabel : `${time} ${placeLabel}`)}.`;
  }
  return time === null ? '맡겨 둔 관심에 맞아요.' : `${time}에 시작해요.`;
}

// A new match of a watched interest: the start in Korea and the Place, leaving out what is unknown. It rings once.
function interestWords({
  subject,
  id,
  title,
  startsAt,
  placeLabel,
}: Told & { kind: 'interest-new' }): NotificationWords {
  const event = subject === 'event';
  const time = startsAt === null ? null : clockOf(startsAt);
  return {
    title: event ? `${withSubject(title)} 떴어요` : `${title} 모집이 떴어요`,
    ahead: null,
    line: [time, placeLabel].filter((part) => part !== null).join(' '),
    card: { kind: event ? 'event' : 'party', id },
    about: null,
    rings: true,
    body: interestBody(time, placeLabel),
  };
}

// "14:10 정문 앞에서 만나기", or "'정문 앞에서 만나기' 취소".
function stepLine({ stepTitle, startsAt, cancelled }: Of<'step-changed'>): string {
  if (cancelled) {
    return `'${stepTitle}' 취소`;
  }
  return startsAt === null ? stepTitle : `${clockOf(startsAt)} ${stepTitle}`;
}

// What a party's members would have said in words. Each rings, is about the member, and opens the party's room.
function memberWords(told: Of<'step-changed'> | Of<'arrived'> | Of<'late'>): NotificationWords {
  const card = { kind: 'party', id: told.questId };
  if (told.kind === 'step-changed') {
    const line = stepLine(told);
    return {
      title: `${withSubject(told.byName)} 일정을 바꿨어요`,
      ahead: null,
      line,
      card,
      about: told.byId,
      rings: true,
      body: `${line}.`,
    };
  }
  if (told.kind === 'arrived') {
    return {
      title: `${withSubject(told.name)} 도착했어요`,
      ahead: null,
      line: told.placeLabel,
      card,
      about: told.userId,
      rings: true,
      body: `${told.placeLabel}에 있어요.`,
    };
  }
  const arrival = told.arriveAt === null ? null : `${clockOf(new Date(told.arriveAt))} 도착`;
  const line = arrival === null ? told.questTitle : `${arrival} · ${told.questTitle}`;
  return {
    title: `${withSubject(told.name)} ${String(told.minutes)}분 늦어요`,
    ahead: null,
    line,
    card,
    about: told.userId,
    rings: true,
    body: `${line}.`,
  };
}

// A request to join and its answer ring. The title leads with the answer and the line names the 파티, so that a long
// title of the 파티 is what one line cuts. An answer of accepting opens the party; one of declining opens 찾기, for
// another 파티. The requests waiting open the party, whose room answers them.
function joinWords(told: Of<'join-accepted'> | Of<'join-declined'> | Of<'join-asked'>): NotificationWords {
  if (told.kind === 'join-asked') {
    const who = told.waiting > 1 ? `${told.name}님 외 ${String(told.waiting - 1)}명` : `${told.name}님`;
    return {
      title: `새 참여 신청 ${String(told.waiting)}명`,
      ahead: null,
      line: `${told.questTitle} · ${who}`,
      card: { kind: 'party', id: told.questId },
      about: null,
      rings: true,
      body: `${who}이 ${told.questTitle}에 참여를 신청했어요.`,
    };
  }
  const accepted = told.kind === 'join-accepted';
  return {
    title: accepted ? '참여 신청이 수락됐어요' : '참여 신청이 거절됐어요',
    ahead: null,
    line: `${told.questTitle} · ${told.leaderName}님의 파티`,
    card: { kind: accepted ? 'party' : 'find-parties', id: told.questId },
    about: null,
    rings: true,
    body: accepted
      ? `${told.questTitle}, 이제 내 파티에서 볼 수 있어요.`
      : `${told.questTitle}, ${told.leaderName}님이 신청을 받지 않았어요.`,
  };
}

// A 파티 gone opens the card `party-gone`, which no map holds: the app says the 파티 is gone. Each kind's title says
// what happened and its line names the 파티, as a request to join's do. A member's ring, with the push's body; a request
// or an invitation that waited is only in 알림.
const GONE: Record<GoneKind, { title: string; line: string; body: string | null }> = {
  'party-ended': { title: '파티가 없어졌어요', line: '님이 없앴어요', body: '님이 파티를 없앴어요.' },
  'party-removed': { title: '파티에서 내보내졌어요', line: '님의 파티', body: '님이 파티에서 내보냈어요.' },
  'join-cancelled': { title: '파티가 없어져 신청이 취소됐어요', line: '님의 파티', body: null },
  'invitation-cancelled': { title: '파티가 없어져 초대가 취소됐어요', line: '님의 파티', body: null },
};

function isGone(told: Told): told is PartyGone {
  return Object.hasOwn(GONE, told.kind);
}

function goneWords({ kind, questId, questTitle, leaderName }: PartyGone): NotificationWords {
  const { title, line, body } = GONE[kind];
  return {
    title,
    ahead: null,
    line: `${questTitle} · ${leaderName}${line}`,
    card: { kind: 'party-gone', id: questId },
    about: null,
    rings: body !== null,
    body: body === null ? null : `${questTitle}, ${leaderName}${body}`,
  };
}

// `at` is the Notification's time.
export function wordsOf(told: Told, at: Date): NotificationWords {
  if (told.kind === 'interest-new') {
    return interestWords(told);
  }
  if (told.kind === 'step-changed' || told.kind === 'arrived' || told.kind === 'late') {
    return memberWords(told);
  }
  if (told.kind === 'join-accepted' || told.kind === 'join-declined' || told.kind === 'join-asked') {
    return joinWords(told);
  }
  if (isGone(told)) {
    return goneWords(told);
  }
  if (told.kind === 'leave-by') {
    return {
      title: '지금 나서요',
      ahead: `${clockOf(at)} 나설 시각`,
      line: `${told.placeLabel}까지 ${wayWords(told)}`,
      card: { kind: 'party', id: told.questId },
      about: null,
      rings: true,
      body: `${told.placeLabel}까지 ${wayWords(told)}이에요.${towardWords(told.toward)}`,
    };
  }
  if (told.kind === 'room-window') {
    return {
      title: '예약 창이 열렸어요',
      ahead: `${monthDayWords(koreaDate(at))} ${clockOf(at)} 예약 창 열림`,
      line: `${timesWords(told)} 스터디`,
      card: { kind: 'party', id: told.questId },
      about: null,
      rings: true,
      body: `${timesWords(told)} 스터디를 이제 예약할 수 있어요.`,
    };
  }
  if (told.kind === 'accepted' || told.kind === 'declined') {
    return {
      title: `${withSubject(told.friendName)} ${ANSWERS[told.kind]}`,
      ahead: null,
      line: told.questTitle,
      card: { kind: 'party', id: told.questId },
      about: told.friendId,
      rings: false,
      body: null,
    };
  }
  return roomWords(told);
}
