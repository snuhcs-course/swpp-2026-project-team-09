import React, { useState } from "react";
import { Text, View } from "react-native";
import type { Meetup, Party, Quest, User } from "../api";
import { initialTimes, meetupBody } from "../forms";
import { meetupActions, meetupStatus, MeetupAction } from "../meetups";
import { Action, Card, Empty, Field, u } from "./Primitives";
import { TimeEditor } from "./Forms";
const stamp = (value: string) =>
  new Date(value).toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
const statusLabels = {
  pending: "응답 기다리는 중",
  accepted: "계획 수락됨",
  declined: "거절됨",
  cancelled: "제안 취소됨",
  expired: "응답 기간 만료",
};
export function MeetupForm({
  friend,
  busy,
  onSave,
}: {
  friend: User;
  busy: boolean;
  onSave: (body: ReturnType<typeof meetupBody>) => void;
}) {
  const [title, setTitle] = useState(""),
    [place, setPlace] = useState(""),
    [times, setTimes] = useState(initialTimes),
    [error, setError] = useState("");
  return (
    <>
      <Text style={u.title}>{friend.displayName}님에게 약속 계획 제안</Text>
      <Text style={u.body}>
        직접 정한 활동·시간·장소를 함께 보내요. 제안하면 나는 이 계획에
        동의하며, 친구가 수락하면 두 사람의 비공개 파티와 공동 약속이
        만들어져요. 파티별 위치 공유는 기본으로 켜져요. 전체 위치 공유와 서로의
        공개 설정이 허용할 때만 표시되며, 파티 설정에서 끌 수 있어요.
      </Text>
      <Field
        label="약속 이름"
        value={title}
        onChange={setTitle}
        editable={!busy}
        placeholder="예: 점심 먹고 산책하기"
      />
      <TimeEditor value={times} onChange={setTimes} disabled={busy} />
      <Field
        label="만날 장소"
        value={place}
        onChange={setPlace}
        editable={!busy}
        placeholder="예: 학생회관 정문"
      />
      <Text style={u.body}>
        등록되지 않은 일정과 이동 시간은 직접 확인해 주세요. 친구에게 보낼
        정확한 시간을 확인해 주세요. 수락 전에는 제안을 취소한 뒤 새 계획을 보낼
        수 있어요.
      </Text>
      {!!error && <Text style={u.error}>{error}</Text>}
      <Action
        label="이 계획에 동의하고 제안 보내기"
        disabled={busy}
        onPress={() => {
          try {
            const body = meetupBody({
              friendId: friend.id,
              title,
              locationName: place,
              times,
            });
            setError("");
            onSave(body);
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      />
    </>
  );
}
export function MeetupList({
  items,
  userId,
  parties,
  quests,
  busy,
  loaded,
  onRespond,
  onOpen,
  onRefresh,
  onFriends,
}: {
  items: Meetup[];
  userId: string;
  parties: Party[];
  quests: Quest[];
  busy: boolean;
  loaded: boolean;
  onRespond: (meetup: Meetup, action: MeetupAction) => void;
  onOpen: (party: Party) => void;
  onRefresh: () => void;
  onFriends: () => void;
}) {
  const ordered = [...items].sort(
    (a, b) =>
      Number(meetupStatus(a) !== "pending") -
        Number(meetupStatus(b) !== "pending") ||
      Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
  return (
    <>
      <Text style={u.body}>
        활동·시간·장소가 모두 정해진 제안이에요. 받은 계획을 확인한 뒤 확정할 수
        있어요.
      </Text>
      <Action
        secondary
        label="친구에게 약속 계획 제안"
        onPress={onFriends}
        disabled={busy}
      />
      <Action
        secondary
        small
        label="최신 제안 새로고침"
        onPress={onRefresh}
        disabled={busy}
      />
      {!items.length && (
        <Empty
          title={
            loaded ? "아직 약속 제안이 없어요" : "약속 제안을 불러오는 중이에요"
          }
          detail={
            loaded
              ? "친구 목록에서 약속 계획을 제안해 보세요."
              : "연결 상태를 확인한 뒤 새로고침해 주세요."
          }
        />
      )}
      {ordered.map((meetup) => {
        const status = meetupStatus(meetup),
          incoming = meetup.recipient.id === userId,
          other = incoming ? meetup.sender : meetup.recipient,
          actions = meetupActions(meetup, userId);
        const party = parties.find(
            (item) => item.id === meetup.partyId && item.isMember,
          ),
          quest = quests.find((item) => item.id === meetup.questId);
        return (
          <Card key={meetup.id}>
            <Text style={u.badge}>
              {incoming ? "받은 계획" : "보낸 계획"} · {statusLabels[status]}
            </Text>
            <Text style={u.title}>{meetup.title}</Text>
            <Text style={u.body}>{other.displayName}님과 두 사람 약속</Text>
            <Text style={u.label}>제안한 계획 · 기기 현지 시간</Text>
            <Text style={u.body}>
              시작: {stamp(meetup.startsAt)}
              {"\n"}종료: {stamp(meetup.endsAt)}
              {"\n"}장소: {meetup.locationName}
            </Text>
            {actions.includes("accept") && (
              <>
                <Text style={u.body}>
                  위 계획을 수락하면 두 사람의 비공개 파티와 약속에 참여해요.
                  파티별 위치 공유는 기본으로 켜져요. 전체 위치 공유와 서로의
                  공개 설정이 허용할 때만 표시되며, 파티 설정에서 끌 수 있어요.
                  등록되지 않은 일정과 이동 시간은 직접 확인해 주세요.
                </Text>
                <Action
                  label="이 계획으로 약속 확정"
                  disabled={busy}
                  onPress={() => onRespond(meetup, "accept")}
                />
                <Action
                  secondary
                  label="이 계획 거절"
                  disabled={busy}
                  onPress={() => onRespond(meetup, "decline")}
                />
              </>
            )}
            {actions.includes("cancel") && (
              <Action
                secondary
                label="보낸 계획 취소"
                disabled={busy}
                onPress={() => onRespond(meetup, "cancel")}
              />
            )}
            {status === "accepted" && (
              <>
                <Text style={u.body}>
                  두 사람의 비공개 약속이에요. 이후 변경된 시간·장소는 공동
                  약속에서 확인해 주세요.
                  {quest?.status === "cancelled"
                    ? "\n공동 약속이 취소되었어요."
                    : quest && Date.parse(quest.endsAt) <= Date.now()
                      ? "\n공동 약속 시간이 지났어요."
                      : ""}
                </Text>
                {party ? (
                  <Action
                    secondary
                    label="공동 약속 확인 · 수정"
                    disabled={busy}
                    onPress={() => onOpen(party)}
                  />
                ) : (
                  <Text style={u.body}>
                    현재 참여 중인 파티를 확인할 수 없어요. 새로고침한 뒤에도
                    보이지 않으면 파티 참여가 종료된 상태예요.
                  </Text>
                )}
              </>
            )}
            {status === "expired" && (
              <Text style={u.body}>
                시작 시간이 지나 응답할 수 없어요. 친구와 새 계획을 정해 주세요.
              </Text>
            )}
            {(status === "declined" || status === "cancelled") && (
              <Text style={u.body}>
                종료된 제안이에요. 필요하면 친구 목록에서 새 계획을 제안해
                주세요.
              </Text>
            )}
          </Card>
        );
      })}
    </>
  );
}
