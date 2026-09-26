import React, { useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import type { Event, Party, Quest } from "../api";
import {
  dateAfterDays,
  initialTimes,
  matchBody,
  partySize,
  timeRange,
  TimeFields,
} from "../forms";
import { Action, Card, colors, Field, u } from "./Primitives";
export function TimeEditor({
  value,
  onChange,
  disabled = false,
}: {
  value: TimeFields;
  disabled?: boolean;
  onChange: (v: TimeFields) => void;
}) {
  return (
    <View style={{ gap: 15 }}>
      <Text style={u.label}>날짜와 시간 · 기기 현지 시간</Text>
      <View style={[u.row, { justifyContent: "flex-start" }]}>
        {["오늘", "내일", "모레"].map((label, i) => (
          <Pressable
            key={label}
            disabled={disabled}
            onPress={() =>
              onChange({
                ...value,
                startDate: dateAfterDays(i),
                endDate: dateAfterDays(i),
              })
            }
            style={{
              paddingVertical: 9,
              paddingHorizontal: 18,
              borderRadius: 20,
              backgroundColor:
                value.startDate === dateAfterDays(i) ? "#d9eadd" : "#eaece6",
            }}
          >
            <Text style={{ color: colors.teal }}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={u.row}>
        <Field
          editable={!disabled}
          label="시작 날짜"
          value={value.startDate}
          onChange={(startDate) => onChange({ ...value, startDate })}
          placeholder="YYYY-MM-DD"
        />
        <Field
          editable={!disabled}
          label="시작 시간"
          value={value.startTime}
          onChange={(startTime) => onChange({ ...value, startTime })}
          placeholder="HH:mm"
        />
      </View>
      <View style={u.row}>
        <Field
          editable={!disabled}
          label="종료 날짜"
          value={value.endDate}
          onChange={(endDate) => onChange({ ...value, endDate })}
          placeholder="YYYY-MM-DD"
        />
        <Field
          editable={!disabled}
          label="종료 시간"
          value={value.endTime}
          onChange={(endTime) => onChange({ ...value, endTime })}
          placeholder="HH:mm"
        />
      </View>
    </View>
  );
}
export function PartyForm({
  event,
  busy,
  onSave,
}: {
  event?: Event;
  busy: boolean;
  onSave: (body: unknown) => void;
}) {
  const [title, setTitle] = useState(event ? `${event.title} 함께 가요` : ""),
    [size, setSize] = useState("4"),
    [error, setError] = useState("");
  return (
    <>
      <Text style={u.body}>
        {event
          ? `${event.title}에 함께 갈 파티를 만듭니다.`
          : "함께할 활동과 정원을 정해 주세요. 파티를 만들면 바로 참여합니다."}
      </Text>
      <Field
        label="파티 이름"
        value={title}
        onChange={setTitle}
        placeholder="어떤 활동을 함께할까요?"
      />
      <Field label="최대 인원" value={size} onChange={setSize} numeric />
      <Text style={u.body}>
        파티 위치 공유는 기본 켜짐입니다. 전역 위치 공유와 기기 권한은 별도로
        동의해야 합니다.
      </Text>
      {!!error && <Text style={u.error}>{error}</Text>}
      <Action
        label="파티 만들기"
        disabled={busy}
        onPress={() => {
          try {
            if (!title.trim()) throw Error("파티 이름을 입력해 주세요.");
            setError("");
            onSave({
              title: title.trim(),
              maxMembers: partySize(size),
              ...(event ? { eventId: event.id } : {}),
            });
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      />
    </>
  );
}
export function QuestForm({
  party,
  event,
  quest,
  busy,
  onSave,
}: {
  party: Party;
  event?: Event;
  quest?: Quest;
  busy: boolean;
  onSave: (body: unknown) => void;
}) {
  const [title, setTitle] = useState(quest?.title || event?.title || ""),
    [place, setPlace] = useState(
      quest?.locationName || event?.locationName || "",
    ),
    [times, setTimes] = useState(() =>
      initialTimes(
        quest?.startsAt || event?.startsAt,
        quest?.endsAt || event?.endsAt,
      ),
    ),
    [error, setError] = useState(""),
    [expectedVersion, setExpectedVersion] = useState(quest?.version);
  const changedElsewhere = quest && quest.version !== expectedVersion;
  return (
    <>
      <Card>
        <Text style={u.badge}>공동 약속</Text>
        <Text style={u.title}>{party.title}</Text>
        <Text style={u.body}>
          시간과 장소의 변경을 파티원 모두 함께 확인합니다.
        </Text>
      </Card>
      <Field
        label="약속 이름"
        value={title}
        onChange={setTitle}
        placeholder="함께할 활동"
      />
      <Field
        label="만날 장소"
        value={place}
        onChange={setPlace}
        placeholder="구체적인 만남 장소"
      />
      <TimeEditor value={times} onChange={setTimes} />
      {quest?.status === "cancelled" && (
        <Text style={u.error}>이미 취소된 약속은 수정할 수 없습니다.</Text>
      )}
      {changedElsewhere && (
        <Card>
          <Text style={u.error}>
            다른 파티원이 이 약속을 변경했습니다. 입력 내용은 저장되지
            않았습니다.
          </Text>
          <Action
            label="최신 내용으로 다시 편집"
            secondary
            onPress={() => {
              setTitle(quest.title);
              setPlace(quest.locationName);
              setTimes(initialTimes(quest.startsAt, quest.endsAt));
              setExpectedVersion(quest.version);
              setError("");
            }}
          />
        </Card>
      )}
      {!!error && <Text style={u.error}>{error}</Text>}
      <Action
        label={quest ? "변경 저장" : "약속 만들기"}
        disabled={busy || !!changedElsewhere || quest?.status === "cancelled"}
        onPress={() => {
          try {
            if (!title.trim() || !place.trim())
              throw Error("약속 이름과 장소를 입력해 주세요.");
            setError("");
            onSave({
              title: title.trim(),
              locationName: place.trim(),
              ...timeRange(times),
              ...(quest ? { expectedVersion } : { partyId: party.id }),
            });
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      />
    </>
  );
}
export function MatchForm({
  event,
  busy,
  available,
  initialInterests = [],
  onSave,
}: {
  event?: Event;
  busy: boolean;
  available: boolean;
  initialInterests?: string[];
  onSave: (body: unknown) => void;
}) {
  const [activity, setActivity] = useState(event?.title || ""),
    [size, setSize] = useState("4"),
    [interests, setInterests] = useState(() => initialInterests.join(", ")),
    [consent, setConsent] = useState(false),
    [times, setTimes] = useState(() =>
      initialTimes(event?.startsAt, event?.endsAt),
    ),
    [error, setError] = useState("");
  return (
    <>
      <Text style={u.body}>
        {event
          ? `「${event.title}」에 참여할 동행을 찾습니다.`
          : "활동과 가능한 시간을 알려 주시면 조건에 맞는 동행을 찾습니다."}
      </Text>
      <Field
        label="함께할 활동"
        value={activity}
        onChange={setActivity}
        placeholder="예: 저녁 식사"
      />
      <Field
        label="파티 인원 (2~6명)"
        value={size}
        onChange={setSize}
        numeric
      />
      <TimeEditor value={times} onChange={setTimes} />
      <Field
        label="관심사 (쉼표로 구분)"
        value={interests}
        onChange={setInterests}
        placeholder="산책, 공연, 스포츠"
      />
      <Card>
        <View style={u.row}>
          <Text style={[u.body, { flex: 1, color: colors.dark }]}>
            입력한 조건에 맞는 새 파티에 자동 가입하는 것에 동의합니다.
          </Text>
          <Switch
            value={consent}
            onValueChange={setConsent}
            trackColor={{ true: colors.teal }}
          />
        </View>
        <Text style={u.body}>위치 권한과 위치 공유 동의는 별도입니다.</Text>
      </Card>
      {!available && (
        <Text style={u.error}>
          매칭 서버 주소를 설정해야 신청할 수 있습니다.
        </Text>
      )}
      {!!error && <Text style={u.error}>{error}</Text>}
      <Action
        label="동행 찾기 신청"
        disabled={busy || !available || !consent}
        onPress={() => {
          try {
            const body = matchBody({
              activity,
              size,
              interests,
              consent,
              times,
              eventId: event?.id,
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
