/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type ReactElement, useState } from 'react';
import type { LibraryCardData } from '@/api/assistant-types';
import { apiClient } from '@/api/client';
import { newIdempotencyKey } from '@/api/idempotency-key';
import { ROOM_REQUEST_KEY, type RoomRequest, roomRequests } from '@/api/room-requests';
import type { StudyInput } from '@/api/study-plan-types';
import { type CompanionsView, companionsView } from '@/library/cards/room-companions';
import type { RoomMember } from '@/library/client';
import { library } from '@/library/library';
import { Pill, Pills, Said } from './library-parts';
import { AskOneMore } from './room-ask-more';

// A room card with companions runs a room request before it books: "동의 요청 보내기" makes it, the card polls it, and
// 예약하기 waits for "모두 동의했어요". A companion out leaves the request gathering: the card says who, how many more the
// room needs, and the booker may ask one more Friend (`./room-ask-more.tsx`). On 예약하기 the phone reads the
// companions' registered names and 학번 from the server, checks each with the library (getUserCheck) and books with
// what the library answered. The server is told only whether the booking was made.

export const SEND_ASK = '동의 요청 보내기';
export const ALL_CONSENTED = '모두 동의했어요';
export const WAITING = '친구들의 동의를 기다리고 있어요';
export const MORE_FRIENDS = '친구를 더 불러 주세요';

const POLL_MS = 3000;

// The request of each card, by its place in the chat, while the app runs: the sheet may mount the card anew.
const requestOfCard = new Map<string, string>();

// A request kept on the phone for a card shown again, by the card's key (`./waiting-room.ts`).
const requestOfKey = new Map<string, string>();

export function bindPartyRequest(cardKey: string, requestId: string): void {
  requestOfKey.set(cardKey, requestId);
}

// A request taken back: neither the card's place nor its key holds it any more.
function forgetRequest(place: string, cardKey: string): void {
  requestOfCard.delete(place);
  requestOfKey.delete(cardKey);
}

// For the tests: no card has a request.
export function forgetPartyRequests(): void {
  requestOfCard.clear();
  requestOfKey.clear();
}

export interface PartyRequest {
  request: RoomRequest | null;
  // Null before "동의 요청 보내기", and while it is being sent.
  send: (() => void) | null;
  sending: boolean;
  failed: boolean;
  ready: boolean;
  // Shows the request as a change answered it, before the next poll.
  update: (request: RoomRequest) => void;
  // Takes the request back as today: its booking party ends, and the card is as before it was sent (P10 ticket 12).
  // Null without a request still gathering or ready.
  cancel: (() => void) | null;
}

// What a request is made from: a book card's key and its Friends or Quest; a study answer together gives the same, with
// the study input it was made from (P10 ticket 12).
export type PartyCard = Pick<LibraryCardData, 'key' | 'questId' | 'companions'> & { input?: StudyInput };

function makingOf(card: PartyCard, useDesc: string | null): Parameters<typeof roomRequests.make>[0] {
  const extra = {
    ...(useDesc === null ? {} : { useDesc }),
    ...(card.input === undefined ? {} : { input: card.input }),
  };
  return card.questId === null
    ? { key: card.key, friendIds: card.companions.map(({ friendId }) => friendId), ...extra }
    : { key: card.key, questId: card.questId, ...extra };
}

// Takes a request still gathering or ready back: its booking party ends, then `forget` leaves the card without it.
function cancelOf(request: RoomRequest | null, forget: () => void): (() => void) | null {
  if (request === null || (request.status !== 'gathering' && request.status !== 'ready')) {
    return null;
  }
  return () => {
    void apiClient
      .endQuest(request.questId)
      .then(forget)
      .catch(() => null);
  };
}

export function usePartyRequest(
  card: PartyCard,
  place: string,
  useDesc: string | null,
  onMade?: (made: RoomRequest) => void,
): PartyRequest {
  const [id, setId] = useState<string | null>(requestOfCard.get(place) ?? requestOfKey.get(card.key) ?? null);
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [key] = useState(newIdempotencyKey);
  const queryClient = useQueryClient();
  const asked = useQuery({
    queryKey: [...ROOM_REQUEST_KEY, id],
    queryFn: () => roomRequests.get(id ?? ''),
    enabled: id !== null,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === undefined || status === 'gathering' || status === 'ready' ? POLL_MS : false;
    },
  });
  const send = async (): Promise<void> => {
    setSending(true);
    setFailed(false);
    try {
      const made = await roomRequests.make(makingOf(card, useDesc), key);
      requestOfCard.set(place, made.id);
      setId(made.id);
      onMade?.(made);
    } catch {
      setFailed(true);
    } finally {
      setSending(false);
    }
  };
  const request = id === null ? null : (asked.data ?? null);
  return {
    request,
    send: id === null && !sending ? () => void send() : null,
    sending,
    failed,
    ready: request?.status === 'ready',
    update: (next) => {
      queryClient.setQueryData([...ROOM_REQUEST_KEY, id], next);
    },
    cancel: cancelOf(request, () => {
      forgetRequest(place, card.key);
      setId(null);
    }),
  };
}

export function rejectedWords(name: string): string {
  return `${name}님의 정보를 도서관에서 확인하지 못했어요. 확인을 요청했어요.`;
}

// What the card says of its request. With `companions`, the count is over the companions not out.
function statusWords(request: RoomRequest, view: CompanionsView | null): string {
  if (request.failed !== null && request.status === 'gathering') {
    return rejectedWords(request.failed.name);
  }
  const consented = request.consents.filter(({ consented: answer }) => answer === true).length;
  const count = view === null ? `${consented}/${request.consents.length}` : `${view.consented}/${view.inRequest}`;
  // Everyone still in has consented and only the room's minimum is short: nobody's answer is awaited.
  const short = view !== null && view.consented === view.inRequest;
  const words: Record<RoomRequest['status'], string> = {
    gathering: short ? MORE_FRIENDS : `${WAITING} (${count})`,
    ready: ALL_CONSENTED,
    dissolved: request.reason ?? '파티 구성원이 제안을 거절했습니다',
    expired: '예약 시간이 지나 요청이 끝났어요',
    cancelled: '예약을 취소했어요',
    booked: '예약을 마쳤어요',
  };
  return words[request.status];
}

// The request's lines, or "동의 요청 보내기" before it is sent.
export function PartyStatus({ party }: { party: PartyRequest }): ReactElement {
  const { request, send, sending, failed } = party;
  if (request !== null) {
    const ended = request.status === 'dissolved' || request.status === 'expired';
    const view = companionsView(request);
    return (
      <>
        <Said tone={ended ? 'danger' : 'plain'}>{statusWords(request, view)}</Said>
        {view?.lines.map((line) => (
          <Said key={line}>{line}</Said>
        ))}
        {view?.canAskOneMore === true ? <AskOneMore onAsked={party.update} request={request} /> : null}
      </>
    );
  }
  return (
    <>
      {failed ? <Said tone="danger">동의 요청을 보내지 못했어요. 다시 해 주세요.</Said> : null}
      {sending ? <Said>동의 요청을 보내는 중이에요</Said> : null}
      <Pills>
        <Pill disabled={send === null} label={SEND_ASK} onPress={send ?? (() => null)} primary />
      </Pills>
    </>
  );
}

export type Companions = { members: RoomMember[] } | { rejected: string };

// The companions as the library knows them, each checked with getUserCheck. A companion the library does not recognise
// is reported, and asked to check their 내 정보.
export async function checkedCompanions(request: RoomRequest, roomNo: number): Promise<Companions> {
  const companions = await roomRequests.companions(request.id);
  const members: RoomMember[] = [];
  for (const { userId, registeredName, studentNumber } of companions) {
    // oxlint-disable-next-line no-await-in-loop -- the library is asked one companion at a time
    const checked = await library.checkUser(roomNo, { name: registeredName, schoolNo: studentNumber ?? '' });
    const info = checked.useCheckInfo;
    if (info === undefined) {
      // oxlint-disable-next-line no-await-in-loop -- reported once, and the booking stops
      await roomRequests.result(request.id, { ok: false, failedUserId: userId });
      const name = request.consents.find((consent) => consent.userId === userId)?.name ?? registeredName;
      return { rejected: rejectedWords(name) };
    }
    members.push({ name: info.NAME, schoolNo: info.SCHOOLNO });
  }
  return { members };
}
