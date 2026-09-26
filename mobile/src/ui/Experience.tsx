import React, { useEffect, useRef, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import {
  Event,
  request,
  Friend,
  MATCH,
  MatchRequest,
  Party,
  Position,
  Quest,
  User,
} from "../api";
import CampusMap from "../map/CampusMap";
import {
  Action,
  Avatar,
  Card,
  colors,
  Empty,
  Field,
  Sheet,
  u,
} from "./Primitives";
import { MatchForm, PartyForm, QuestForm } from "./Forms";
import { AccountEditor } from "./Account";
import type { Profile } from "../account-forms";
import { Life } from "./Life";
type SheetState =
  | { kind: "event"; id: string }
  | { kind: "party"; id: string }
  | { kind: "partyForm"; eventId?: string }
  | { kind: "questForm"; partyId: string; questId?: string }
  | { kind: "matchForm"; eventId?: string }
  | { kind: "friends" | "settings" | "matches" | "profile" | "timetable" }
  | null;
type Props = {
  token: string;
  user: User;
  events: Event[];
  parties: Party[];
  friends: Friend[];
  quests: Quest[];
  positions: Position[];
  matches: MatchRequest[];
  self: { latitude: number; longitude: number } | null;
  sharing: boolean;
  background: boolean;
  busy: boolean;
  message: string;
  loaded: boolean;
  run: (action: () => Promise<unknown>) => void;
  mutate: (
    path: string,
    method: string,
    body?: unknown,
    base?: string,
  ) => Promise<any>;
  onRefresh: () => Promise<void>;
  onLogout: () => Promise<void>;
  onSharing: (enabled: boolean) => Promise<void>;
  onBackground: (enabled: boolean) => Promise<void>;
  clearMessage: () => void;
  onProfileSaved: (profile: Profile) => void;
};
const stamp = (value: string) =>
  new Date(value).toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
const matchStatus: Record<string, string> = {
  searching: "동행 찾는 중",
  finalizing: "파티 구성 중",
  matched: "파티를 찾았어요",
  cancelled: "신청 취소",
  expired: "기간 만료",
};
export default function Experience(p: Props) {
  const [tab, setTab] = useState(0),
    [sheet, setSheet] = useState<SheetState>(null),
    [selectedPartyId, setSelectedPartyId] = useState(""),
    [friendEmail, setFriendEmail] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const profileVersion = useRef(0);
  useEffect(() => {
    let active = true;
    void request<Profile>("/me/profile", p.token)
      .then((value) => {
        if (active && value.version >= profileVersion.current) {
          profileVersion.current = value.version;
          setProfile(value);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [p.token]);
  const profileSaved = (value: Profile) => {
    if (value.version < profileVersion.current) return;
    profileVersion.current = value.version;
    setProfile(value);
    p.onProfileSaved(value);
  };
  const open = (next: SheetState) => {
    p.clearMessage();
    setSheet(next);
  };
  const mine = p.parties.filter((item) => item.isMember),
    selected = p.parties.find(
      (item) => item.id === selectedPartyId && item.isMember,
    );
  const upcoming = p.quests
    .filter(
      (q) => q.status !== "cancelled" && Date.parse(q.endsAt) > Date.now(),
    )
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  const visibleEvents = p.events
    .filter((e) => e.status === "published")
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  const event =
    sheet &&
    (sheet.kind === "event"
      ? p.events.find((e) => e.id === sheet.id)
      : "eventId" in sheet
        ? p.events.find((e) => e.id === sheet.eventId)
        : undefined);
  const party =
    sheet &&
    (sheet.kind === "party"
      ? p.parties.find((item) => item.id === sheet.id)
      : sheet.kind === "questForm"
        ? p.parties.find((item) => item.id === sheet.partyId)
        : undefined);
  const quest =
    sheet?.kind === "questForm"
      ? p.quests.find((q) => q.id === sheet.questId)
      : undefined;
  const selectedParty = (item: Party) => {
    setSelectedPartyId(item.id);
    setSheet({ kind: "party", id: item.id });
    setTab(2);
  };
  const join = (item: Party) =>
    p.run(async () => {
      const joined = (await p.mutate(
        `/parties/${item.id}/join`,
        "POST",
      )) as Party;
      selectedParty(joined);
    });
  const partyCard = (item: Party) => (
    <Card key={item.id} onPress={() => open({ kind: "party", id: item.id })}>
      <View style={u.row}>
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={u.badge}>
            {item.isMember ? "참여 중" : "함께할 사람을 찾고 있어요"}
          </Text>
          <Text style={u.title}>{item.title}</Text>
        </View>
        <Text style={styles.count}>
          {item.memberCount} / {item.maxMembers}
        </Text>
      </View>
      {item.isMember && (
        <View style={[u.row, { justifyContent: "flex-start" }]}>
          {item.members.slice(0, 5).map((member) => (
            <Avatar key={member.id} user={member} size={29} />
          ))}
          <Text style={u.body}>파티 보기 ›</Text>
        </View>
      )}
    </Card>
  );
  const questCard = (item: Quest, compact = false) => (
    <Card
      key={item.id}
      style={compact ? styles.peek : undefined}
      onPress={() => open({ kind: "party", id: item.partyId })}
    >
      <Text style={u.badge}>
        {item.status === "cancelled" ? "취소된 약속" : "함께하는 약속"}
      </Text>
      <Text style={u.title} numberOfLines={1}>
        {item.title}
      </Text>
      <Text style={u.body} numberOfLines={1}>
        {item.locationName}
      </Text>
      <Text style={{ color: colors.teal, fontSize: 13 }}>
        {stamp(item.startsAt)}
      </Text>
    </Card>
  );
  const eventCard = (item: Event, compact = false) => (
    <Card
      key={item.id}
      style={compact ? styles.peek : undefined}
      onPress={() => open({ kind: "event", id: item.id })}
    >
      <View style={u.row}>
        <Text style={u.badge}>
          {item.status === "cancelled" ? "취소된 행사" : "캠퍼스 행사"}
        </Text>
        <Text style={{ color: colors.teal }}>↗</Text>
      </View>
      <Text style={u.title} numberOfLines={compact ? 1 : 2}>
        {item.title}
      </Text>
      <Text style={u.body} numberOfLines={1}>
        {item.locationName}
      </Text>
      <Text style={{ color: colors.teal, fontSize: 13 }}>
        {stamp(item.startsAt)}
      </Text>
    </Card>
  );
  const heading =
    sheet?.kind === "event"
      ? "행사 상세"
      : sheet?.kind === "party"
        ? "우리 파티"
        : sheet?.kind === "partyForm"
          ? "새 파티 만들기"
          : sheet?.kind === "questForm"
            ? quest
              ? "공동 약속 수정"
              : "공동 약속 만들기"
            : sheet?.kind === "matchForm"
              ? "동행 찾기"
              : sheet?.kind === "friends"
                ? "친구"
                : sheet?.kind === "matches"
                  ? "내 매칭 신청"
                  : sheet?.kind === "profile"
                    ? "프로필 편집"
                    : sheet?.kind === "timetable"
                      ? "내 학기 시간표"
                      : "내 계정 · 위치 공유";
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>캠퍼스</Text>
          <Text style={styles.subtitle}>함께하면 더 가까워지는 하루</Text>
        </View>
        <View style={u.row}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="친구 목록"
            onPress={() => open({ kind: "friends" })}
            style={styles.headerButton}
          >
            <Text style={{ fontSize: 18, color: colors.teal }}>♧</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="내 계정과 위치 공유 설정"
            onPress={() => open({ kind: "settings" })}
          >
            <Avatar user={p.user} />
          </Pressable>
        </View>
      </View>
      {!!p.message && !sheet && (
        <Pressable onPress={p.clearMessage} style={styles.notice}>
          <Text accessibilityLiveRegion="polite" style={u.error}>
            {p.message}
          </Text>
          <Text style={u.body}>닫기 ×</Text>
        </Pressable>
      )}
      {p.busy && !sheet && (
        <View style={styles.loading}>
          <ActivityIndicator size="small" color={colors.teal} />
          <Text style={u.body}>불러오는 중…</Text>
        </View>
      )}
      {tab === 0 ? (
        <View style={styles.mapPane}>
          <CampusMap
            events={p.events}
            positions={p.positions}
            self={p.self}
            onSelectEvent={(id: string) => open({ kind: "event", id })}
            onSelectPerson={() => open({ kind: "friends" })}
          />
          <View style={styles.mapTop} pointerEvents="box-none">
            <Pressable
              onPress={() => open({ kind: "settings" })}
              style={styles.sharingBadge}
            >
              <View
                style={[
                  styles.dot,
                  { backgroundColor: p.sharing ? colors.teal : "#a9b3ab" },
                ]}
              />
              <Text
                style={{ color: colors.dark, fontSize: 12, fontWeight: "600" }}
              >
                {p.sharing ? "동의한 관계에 위치 공유 중" : "위치 공유 꺼짐"}
              </Text>
              <Text style={u.body}>›</Text>
            </Pressable>
            <Action
              label="새로고침"
              small
              secondary
              disabled={p.busy}
              onPress={() => p.run(p.onRefresh)}
            />
          </View>
          <View style={styles.mapBottom} pointerEvents="box-none">
            <View style={styles.mapTitle}>
              <Text style={u.title}>
                {upcoming.length ? "다가오는 약속" : "캠퍼스에서 만나요"}
              </Text>
              <Pressable onPress={() => setTab(upcoming.length ? 2 : 1)}>
                <Text style={{ color: colors.teal, fontSize: 13 }}>
                  전체 보기 ›
                </Text>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                gap: 10,
                paddingHorizontal: 18,
                paddingBottom: 5,
              }}
            >
              {upcoming.length ? (
                upcoming.slice(0, 5).map((q) => questCard(q, true))
              ) : visibleEvents.length ? (
                visibleEvents.slice(0, 5).map((e) => eventCard(e, true))
              ) : (
                <Card style={styles.peek}>
                  <Text style={u.title}>
                    {p.loaded
                      ? "아직 예정된 활동이 없어요"
                      : "활동을 불러오는 중"}
                  </Text>
                  <Text style={u.body}>
                    {p.loaded
                      ? "파티를 만들고 함께할 약속을 잡아 보세요."
                      : "서버에서 공개 행사와 약속을 확인합니다."}
                  </Text>
                  <Action
                    label="파티 만들기"
                    secondary
                    small
                    onPress={() => open({ kind: "partyForm" })}
                  />
                </Card>
              )}
            </ScrollView>
          </View>
        </View>
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={p.busy}
              onRefresh={() => p.run(p.onRefresh)}
              tintColor={colors.teal}
            />
          }
          contentContainerStyle={styles.content}
        >
          {tab === 1 && (
            <>
              <View style={u.row}>
                <View>
                  <Text style={u.badge}>DISCOVER</Text>
                  <Text style={u.heading}>함께 가고 싶은 행사</Text>
                </View>
                <Text style={styles.count}>{p.events.length}</Text>
              </View>
              <Text style={u.body}>
                관심 있는 행사를 선택하고 동행을 만나세요.
              </Text>
              {!p.events.length && (
                <Empty
                  title={
                    p.loaded ? "공개된 행사가 없어요" : "행사를 확인하고 있어요"
                  }
                  detail={
                    p.loaded
                      ? "새 행사가 공개되면 이곳과 지도에서 볼 수 있어요."
                      : "연결 상태는 상단 안내를 확인해 주세요."
                  }
                />
              )}{" "}
              {[...p.events]
                .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
                .map((e) => eventCard(e))}
            </>
          )}
          {tab === 2 && (
            <>
              <View>
                <Text style={u.badge}>TOGETHER</Text>
                <Text style={u.heading}>우리의 약속과 파티</Text>
              </View>
              <View style={u.row}>
                <View style={{ flex: 1 }}>
                  <Action
                    label="＋ 파티 만들기"
                    onPress={() => open({ kind: "partyForm" })}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Action
                    label="동행 찾기"
                    secondary
                    onPress={() => open({ kind: "matchForm" })}
                  />
                </View>
              </View>
              <Pressable
                style={styles.slimRow}
                onPress={() => open({ kind: "matches" })}
              >
                <Text style={u.title}>내 매칭 신청</Text>
                <Text style={u.body}>{p.matches.length}건 ›</Text>
              </Pressable>
              {selected && (
                <Card
                  style={{ borderColor: colors.teal }}
                  onPress={() => open({ kind: "party", id: selected.id })}
                >
                  <Text style={u.badge}>선택한 파티</Text>
                  <Text style={u.title}>{selected.title}</Text>
                  <Action
                    label="이 파티에 약속 만들기"
                    small
                    secondary
                    onPress={() =>
                      open({ kind: "questForm", partyId: selected.id })
                    }
                  />
                </Card>
              )}
              <Text style={u.title}>다가오는 공동 약속</Text>
              {upcoming.length ? (
                upcoming.map((q) => questCard(q))
              ) : (
                <Text style={u.body}>
                  파티에서 시간과 장소를 정해 첫 약속을 만들어 보세요.
                </Text>
              )}
              <View style={u.row}>
                <Text style={u.title}>참여 중인 파티</Text>
                <Text style={styles.count}>{mine.length}</Text>
              </View>
              {mine.length ? (
                mine.map(partyCard)
              ) : (
                <Text style={u.body}>아직 참여한 파티가 없습니다.</Text>
              )}
              <Text style={u.title}>새로운 파티 둘러보기</Text>
              {p.parties.filter((item) => !item.isMember).map(partyCard)}
              {!p.parties.some((item) => !item.isMember) && (
                <Text style={u.body}>
                  현재 참여할 수 있는 다른 파티가 없습니다.
                </Text>
              )}
              <Action
                label="친구 보기 · 요청 보내기"
                secondary
                onPress={() => open({ kind: "friends" })}
              />
            </>
          )}
          {tab === 3 && <Life token={p.token} busy={p.busy} run={p.run} />}
        </ScrollView>
      )}
      <View style={styles.tabBar}>
        {[
          ["◎", "지도"],
          ["▤", "행사"],
          ["♧", "약속 / 파티"],
          ["☀", "생활"],
        ].map(([icon, label], index) => (
          <Pressable
            key={label}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === index }}
            accessibilityLabel={label}
            onPress={() => setTab(index)}
            style={styles.tab}
          >
            <View
              style={[
                styles.tabIcon,
                tab === index && { backgroundColor: "#dfece3" },
              ]}
            >
              <Text
                style={{
                  fontSize: 21,
                  color: tab === index ? colors.teal : colors.muted,
                }}
              >
                {icon}
              </Text>
            </View>
            <Text
              style={{
                fontSize: 11,
                fontWeight: tab === index ? "700" : "400",
                color: tab === index ? colors.teal : colors.muted,
              }}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
      {sheet && (
        <Sheet
          title={heading}
          onClose={() => setSheet(null)}
          busy={p.busy}
          message={p.message}
        >
          {sheet.kind === "event" &&
            (event ? (
              <>
                <Text style={u.badge}>
                  {event.status === "cancelled" ? "취소된 행사" : "캠퍼스 행사"}
                </Text>
                <Text style={u.heading}>{event.title}</Text>
                <Text style={u.body}>
                  {event.description || "등록된 상세 설명이 없습니다."}
                </Text>
                <Card>
                  <Text style={u.label}>언제</Text>
                  <Text style={u.body}>
                    {stamp(event.startsAt)} — {stamp(event.endsAt)}
                  </Text>
                  <Text style={u.label}>어디서</Text>
                  <Text style={u.body}>{event.locationName}</Text>
                </Card>
                <Text style={u.title}>이 행사에 함께 가는 파티</Text>
                {p.parties
                  .filter((item) => item.eventId === event.id)
                  .map(partyCard)}
                {!p.parties.some((item) => item.eventId === event.id) && (
                  <Text style={u.body}>
                    첫 파티를 만들어 동행을 모아 보세요.
                  </Text>
                )}
                <Action
                  label="이 행사 파티 만들기"
                  disabled={event.status !== "published"}
                  onPress={() => open({ kind: "partyForm", eventId: event.id })}
                />
                <Action
                  label="이 행사 동행 매칭"
                  secondary
                  disabled={event.status !== "published"}
                  onPress={() => open({ kind: "matchForm", eventId: event.id })}
                />
              </>
            ) : (
              <Empty
                title="행사를 찾을 수 없어요"
                detail="목록을 새로고침해 주세요."
              />
            ))}
          {sheet.kind === "party" &&
            (party ? (
              <>
                <Text style={u.heading}>{party.title}</Text>
                <Text style={u.body}>
                  {party.memberCount}명 참여 · 최대 {party.maxMembers}명
                </Text>
                {party.eventId && (
                  <Action
                    label="연결된 행사 보기"
                    secondary
                    small
                    onPress={() => open({ kind: "event", id: party.eventId! })}
                  />
                )}{" "}
                {party.isMember ? (
                  <>
                    <View style={{ gap: 12 }}>
                      {party.members.map((member) => (
                        <View
                          key={member.id}
                          style={[u.row, { justifyContent: "flex-start" }]}
                        >
                          <Avatar user={member} />
                          <Text style={u.title}>
                            {member.displayName}
                            {member.id === p.user.id ? " · 나" : ""}
                          </Text>
                        </View>
                      ))}
                    </View>
                    <Card>
                      <View style={u.row}>
                        <View style={{ flex: 1 }}>
                          <Text style={u.label}>이 파티와 위치 공유</Text>
                          <Text style={u.body}>
                            내 위치 공개와 상대 위치 열람을 함께 설정합니다.
                          </Text>
                        </View>
                        <Switch
                          value={party.sharingEnabled === true}
                          disabled={
                            p.busy || party.sharingEnabled === undefined
                          }
                          onValueChange={(enabled) =>
                            p.run(() =>
                              p.mutate(
                                `/parties/${party.id}/sharing`,
                                "PATCH",
                                { enabled },
                              ),
                            )
                          }
                          trackColor={{ true: colors.teal }}
                        />
                      </View>
                      <Text style={u.body}>
                        꺼도 별도로 서로 공유 중인 친구와의 공유는 유지됩니다.
                      </Text>
                    </Card>
                    <Action
                      label="＋ 공동 약속 만들기"
                      onPress={() =>
                        open({ kind: "questForm", partyId: party.id })
                      }
                    />
                    {p.quests
                      .filter((q) => q.partyId === party.id)
                      .map((q) => (
                        <Card key={q.id}>
                          <Text style={u.badge}>
                            {q.status === "cancelled"
                              ? "취소된 약속"
                              : "공동 약속"}
                          </Text>
                          <Text style={u.title}>{q.title}</Text>
                          <Text style={u.body}>
                            {q.locationName} · {stamp(q.startsAt)}
                          </Text>
                          {q.status !== "cancelled" && (
                            <View style={u.row}>
                              <Action
                                label="약속 수정"
                                secondary
                                small
                                disabled={p.busy}
                                onPress={() =>
                                  open({
                                    kind: "questForm",
                                    partyId: party.id,
                                    questId: q.id,
                                  })
                                }
                              />
                              <Action
                                label="약속 취소"
                                secondary
                                small
                                disabled={p.busy}
                                onPress={() =>
                                  Alert.alert(
                                    "약속을 취소할까요?",
                                    "모든 파티원이 취소 상태를 확인하게 됩니다.",
                                    [
                                      { text: "돌아가기", style: "cancel" },
                                      {
                                        text: "약속 취소",
                                        style: "destructive",
                                        onPress: () =>
                                          p.run(() =>
                                            p.mutate(
                                              `/quests/${q.id}`,
                                              "PATCH",
                                              {
                                                status: "cancelled",
                                                expectedVersion: q.version,
                                              },
                                            ),
                                          ),
                                      },
                                    ],
                                  )
                                }
                              />
                            </View>
                          )}
                        </Card>
                      ))}
                    <Action
                      label="파티 나가기"
                      secondary
                      disabled={p.busy}
                      onPress={() =>
                        Alert.alert("파티에서 나갈까요?", party.title, [
                          { text: "남아 있기", style: "cancel" },
                          {
                            text: "나가기",
                            style: "destructive",
                            onPress: () =>
                              p.run(async () => {
                                await p.mutate(
                                  `/parties/${party.id}/membership`,
                                  "DELETE",
                                );
                                if (selectedPartyId === party.id)
                                  setSelectedPartyId("");
                                setSheet(null);
                              }),
                          },
                        ])
                      }
                    />
                  </>
                ) : (
                  <>
                    <Text style={u.body}>
                      참여하면 파티원과 공동 약속을 확인할 수 있습니다.
                    </Text>
                    <Action
                      label={
                        party.memberCount >= party.maxMembers
                          ? "정원이 찼어요"
                          : "이 파티 참여하기"
                      }
                      disabled={p.busy || party.memberCount >= party.maxMembers}
                      onPress={() => join(party)}
                    />
                  </>
                )}
              </>
            ) : (
              <Empty
                title="파티를 찾을 수 없어요"
                detail="파티 목록을 새로고침해 주세요."
              />
            ))}
          {sheet.kind === "partyForm" &&
            (sheet.eventId && event?.status !== "published" ? (
              <Empty
                title="행사를 다시 확인해 주세요"
                detail="선택한 행사가 현재 목록에 없습니다."
              />
            ) : (
              <PartyForm
                key={sheet.eventId || "standalone-party"}
                event={event || undefined}
                busy={p.busy}
                onSave={(body) =>
                  p.run(async () =>
                    selectedParty(
                      (await p.mutate("/parties", "POST", body)) as Party,
                    ),
                  )
                }
              />
            ))}
          {sheet.kind === "questForm" &&
            (party?.isMember && (!sheet.questId || quest) ? (
              <QuestForm
                key={sheet.questId || `new-${party.id}`}
                party={party}
                event={p.events.find((e) => e.id === party.eventId)}
                quest={quest}
                busy={p.busy}
                onSave={(body) =>
                  p.run(async () => {
                    await p.mutate(
                      quest ? `/quests/${quest.id}` : "/quests",
                      quest ? "PATCH" : "POST",
                      body,
                    );
                    setSheet({ kind: "party", id: party.id });
                  })
                }
              />
            ) : (
              <Empty
                title="참여 중인 파티가 필요해요"
                detail="파티에 참여한 뒤 공동 약속을 만들 수 있습니다."
              />
            ))}
          {sheet.kind === "matchForm" &&
            (sheet.eventId && event?.status !== "published" ? (
              <Empty
                title="행사를 다시 확인해 주세요"
                detail="선택한 행사를 찾을 수 없어 신청할 수 없습니다."
              />
            ) : (
              <MatchForm
                key={sheet.eventId || "standalone-match"}
                event={event || undefined}
                busy={p.busy}
                initialInterests={profile?.interests ?? []}
                available={!!MATCH}
                onSave={(body) =>
                  p.run(async () => {
                    await p.mutate("/matches", "POST", body, MATCH);
                    setSheet({ kind: "matches" });
                  })
                }
              />
            ))}
          {sheet.kind === "matches" && (
            <>
              {!MATCH && (
                <Text style={u.error}>매칭 서버 주소 설정이 필요합니다.</Text>
              )}
              {!p.matches.length && (
                <Empty
                  title="아직 매칭 신청이 없어요"
                  detail="가능한 시간과 활동을 정하고 동행 찾기를 신청해 보세요."
                />
              )}
              {p.matches.map((m) => (
                <Card key={m.id}>
                  <Text style={u.badge}>
                    {matchStatus[m.status] || m.status}
                  </Text>
                  <Text style={u.title}>{m.activity}</Text>
                  <Text style={u.body}>
                    {stamp(m.timeStart)} — {stamp(m.timeEnd)}
                  </Text>
                  <Text style={u.body}>
                    {m.explanation ||
                      m.aiStatus ||
                      "서버에서 동행 찾기 상태를 확인하고 있습니다."}
                  </Text>
                  {m.partyId && (
                    <Action
                      label="매칭된 파티 보기"
                      secondary
                      small
                      onPress={() => {
                        setSelectedPartyId(m.partyId!);
                        open({ kind: "party", id: m.partyId! });
                        setTab(2);
                      }}
                    />
                  )}
                  {m.status === "searching" && (
                    <Action
                      label="신청 취소"
                      secondary
                      small
                      disabled={p.busy}
                      onPress={() =>
                        p.run(() =>
                          p.mutate(
                            `/matches/${m.id}`,
                            "DELETE",
                            undefined,
                            MATCH,
                          ),
                        )
                      }
                    />
                  )}
                </Card>
              ))}
            </>
          )}
          {sheet.kind === "friends" && (
            <>
              <Card>
                <Text style={u.title}>친구에게 먼저 인사해요</Text>
                <Field
                  label="학교 이메일"
                  value={friendEmail}
                  onChange={setFriendEmail}
                  placeholder="친구의 snu.ac.kr 이메일"
                />
                <Action
                  label="친구 요청 보내기"
                  disabled={p.busy || !friendEmail.trim()}
                  onPress={() =>
                    p.run(async () => {
                      await p.mutate("/friends", "POST", {
                        email: friendEmail.trim(),
                      });
                      setFriendEmail("");
                    })
                  }
                />
              </Card>
              {!p.friends.length && (
                <Empty
                  title="아직 연결된 친구가 없어요"
                  detail="학교 이메일로 친구 요청을 보낼 수 있어요."
                />
              )}
              {p.friends.map((f) => (
                <Card key={f.id}>
                  <View style={[u.row, { justifyContent: "flex-start" }]}>
                    <Avatar user={f.user} />
                    <View>
                      <Text style={u.title}>{f.user.displayName}</Text>
                      <Text style={u.body}>
                        {f.status === "accepted"
                          ? "친구"
                          : f.direction === "incoming"
                            ? "받은 친구 요청"
                            : "보낸 요청 · 기다리는 중"}
                      </Text>
                    </View>
                  </View>
                  {f.status === "pending" && f.direction === "incoming" && (
                    <Action
                      label="친구 요청 수락"
                      disabled={p.busy}
                      onPress={() =>
                        p.run(() => p.mutate(`/friends/${f.id}/accept`, "POST"))
                      }
                    />
                  )}{" "}
                  {f.status === "accepted" && (
                    <View style={u.row}>
                      <Text style={u.body}>이 친구와 서로 위치 공유</Text>
                      <Switch
                        value={f.sharingEnabled}
                        disabled={p.busy}
                        onValueChange={(enabled) =>
                          p.run(() =>
                            p.mutate(`/friends/${f.id}/sharing`, "PATCH", {
                              enabled,
                            }),
                          )
                        }
                        trackColor={{ true: colors.teal }}
                      />
                    </View>
                  )}
                </Card>
              ))}
            </>
          )}
          {(sheet.kind === "profile" || sheet.kind === "timetable") && (
            <AccountEditor
              key={`${p.token}:${sheet.kind}`}
              token={p.token}
              kind={sheet.kind}
              onProfileSaved={profileSaved}
            />
          )}
          {sheet.kind === "settings" && (
            <>
              <View style={[u.row, { justifyContent: "flex-start" }]}>
                <Avatar user={p.user} size={56} />
                <View>
                  <Text style={u.title}>{p.user.displayName}</Text>
                  <Text style={u.body}>{p.user.email}</Text>
                </View>
              </View>
              <Action
                secondary
                label="프로필 편집"
                onPress={() => open({ kind: "profile" })}
              />
              <Action
                secondary
                label="내 학기 시간표"
                onPress={() => open({ kind: "timetable" })}
              />
              <Card>
                <View style={u.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={u.title}>내 위치 공유</Text>
                    <Text style={u.body}>
                      동의한 친구·파티 관계에서만 서로 볼 수 있어요.
                    </Text>
                  </View>
                  <Switch
                    value={p.sharing}
                    disabled={p.busy}
                    onValueChange={(enabled) =>
                      p.run(() => p.onSharing(enabled))
                    }
                    trackColor={{ true: colors.teal }}
                  />
                </View>
                <Text style={u.body}>
                  친구나 파티에서 한쪽이 끄면 해당 관계의 공개와 열람이 함께
                  중단됩니다.
                </Text>
              </Card>
              <Card>
                <View style={u.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={u.title}>앱을 닫아도 위치 공유</Text>
                    <Text style={u.body}>
                      별도 기기 권한과 HTTPS 연결이 필요합니다.
                    </Text>
                  </View>
                  <Switch
                    value={p.background}
                    disabled={p.busy || !p.sharing}
                    onValueChange={(enabled) =>
                      p.run(() => p.onBackground(enabled))
                    }
                    trackColor={{ true: colors.teal }}
                  />
                </View>
              </Card>
              <Text style={u.body}>
                공유를 끄면 새 위치 업로드를 중단합니다. 오프라인인 경우 이전에
                공유된 위치는 서버 보관 시간이 지나면 사라집니다.
              </Text>
              <Action
                label="로그아웃"
                secondary
                disabled={p.busy}
                onPress={() => p.run(p.onLogout)}
              />
            </>
          )}
        </Sheet>
      )}
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  header: {
    paddingHorizontal: 21,
    paddingTop: 12,
    paddingBottom: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.cream,
  },
  logo: {
    fontSize: 25,
    fontWeight: "800",
    color: colors.teal,
    letterSpacing: -1,
  },
  subtitle: { fontSize: 11, color: colors.muted, marginTop: 3 },
  headerButton: {
    height: 38,
    width: 38,
    borderRadius: 19,
    backgroundColor: "#e7eee6",
    alignItems: "center",
    justifyContent: "center",
  },
  mapPane: { flex: 1, position: "relative" },
  mapTop: {
    position: "absolute",
    top: 14,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    alignItems: "center",
  },
  sharingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#ffffffed",
    borderRadius: 22,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  mapBottom: { position: "absolute", bottom: 15, left: 0, right: 0, gap: 10 },
  mapTitle: {
    marginHorizontal: 18,
    padding: 11,
    borderRadius: 13,
    backgroundColor: "#f6f5eff2",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  peek: {
    width: 272,
    shadowColor: "#18372a",
    shadowOpacity: 0.09,
    shadowRadius: 8,
    elevation: 3,
  },
  content: { padding: 20, gap: 17, paddingBottom: 35 },
  count: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.teal,
    backgroundColor: "#e5eee5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  slimRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 7,
    paddingBottom: 10,
  },
  tab: { flex: 1, alignItems: "center", gap: 4 },
  tabIcon: {
    width: 49,
    height: 31,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  notice: {
    paddingHorizontal: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  loading: {
    paddingVertical: 6,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
});
