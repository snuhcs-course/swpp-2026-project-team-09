/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { type ReactElement, useState } from 'react';
import type { LibraryCardData } from '@/api/assistant-types';
import { newIdempotencyKey } from '@/api/idempotency-key';
import { ROOM_REQUEST_KEY, type RoomRequest, roomRequests } from '@/api/room-requests';
import type { RoomMember } from '@/library/client';
import { library } from '@/library/library';
import { Pill, Pills, Said } from './library-parts';

// A room card with companions runs a room request before it books: "동의 요청 보내기" makes it, the card polls it, and
// 예약하기 waits for "모두 동의했어요". On 예약하기 the phone reads the companions' registered names and 학번 from the
// server, checks each with the library (getUserCheck) and books with what the library answered. The server is told only
// whether the booking was made.

export const SEND_ASK = '동의 요청 보내기';
export const ALL_CONSENTED = '모두 동의했어요';
export const WAITING = '친구들의 동의를 기다리고 있어요';

const POLL_MS = 3000;

// The request of each card, by its place in the chat, while the app runs: the sheet may mount the card anew.
const requestOfCard = new Map<string, string>();

// For the tests: no card has a request.
export function forgetPartyRequests(): void {
  requestOfCard.clear();
}

export interface PartyRequest {
  request: RoomRequest | null;
  // Null before "동의 요청 보내기", and while it is being sent.
  send: (() => void) | null;
  sending: boolean;
  failed: boolean;
  ready: boolean;
}

function makingOf(card: LibraryCardData, useDesc: string | null): Parameters<typeof roomRequests.make>[0] {
  const extra = useDesc === null ? {} : { useDesc };
  return card.questId === null
    ? { key: card.key, friendIds: card.companions.map(({ friendId }) => friendId), ...extra }
    : { key: card.key, questId: card.questId, ...extra };
}

export function usePartyRequest(card: LibraryCardData, place: string, useDesc: string | null): PartyRequest {
  const [id, setId] = useState<string | null>(requestOfCard.get(place) ?? null);
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [key] = useState(newIdempotencyKey);
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
  };
}

export function rejectedWords(name: string): string {
  return `${name}님의 정보를 도서관에서 확인하지 못했어요. 확인을 요청했어요.`;
}

// What the card says of its request.
function statusWords(request: RoomRequest): string {
  if (request.failed !== null && request.status === 'gathering') {
    return rejectedWords(request.failed.name);
  }
  const consented = request.consents.filter(({ consented: answer }) => answer === true).length;
  const words: Record<RoomRequest['status'], string> = {
    gathering: `${WAITING} (${consented}/${request.consents.length})`,
    ready: ALL_CONSENTED,
    dissolved: request.reason ?? '파티 구성원이 제안을 거절했습니다',
    expired: '예약 시간이 지나 요청이 끝났어요',
    cancelled: '예약을 취소했어요',
    booked: '예약을 마쳤어요',
  };
  return words[request.status];
}

// The request's line, or "동의 요청 보내기" before it is sent.
export function PartyStatus({ party }: { party: PartyRequest }): ReactElement {
  const { request, send, sending, failed } = party;
  if (request !== null) {
    const ended = request.status === 'dissolved' || request.status === 'expired';
    return <Said tone={ended ? 'danger' : 'plain'}>{statusWords(request)}</Said>;
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
