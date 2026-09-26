import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
  Button,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import Constants from "expo-constants";
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { io } from "socket.io-client";
import {
  API,
  MATCH,
  SOCKET,
  request,
  onUnauthorized,
  User,
  Event,
  Party,
  Friend,
  Quest,
  Position,
} from "./src/api";
import {
  setUploadConsent,
  startBackground,
  stopLocation,
  TOKEN_KEY,
  upload,
} from "./src/location";
import {
  canApplyLocations,
  freshLocations,
  LOCATION_TTL_MS,
} from "./src/location-snapshot";
const WEB_CLIENT = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
if (WEB_CLIENT)
  GoogleSignin.configure({
    webClientId: WEB_CLIENT,
    hostedDomain: "snu.ac.kr",
  });
function Card({ children }: { children: React.ReactNode }) {
  return <View style={s.card}>{children}</View>;
}
function Field({
  value,
  set,
  hint,
}: {
  value: string;
  set: (v: string) => void;
  hint: string;
}) {
  return (
    <TextInput
      style={s.input}
      value={value}
      onChangeText={set}
      placeholder={hint}
      autoCapitalize="none"
    />
  );
}
export default function App() {
  const [token, setToken] = useState(""),
    [user, setUser] = useState<User | null>(null),
    [tab, setTab] = useState(0),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const [events, setEvents] = useState<Event[]>([]),
    [parties, setParties] = useState<Party[]>([]),
    [friends, setFriends] = useState<Friend[]>([]),
    [quests, setQuests] = useState<Quest[]>([]),
    [positions, setPositions] = useState<Position[]>([]),
    [matches, setMatches] = useState<any[]>([]);
  const [sharing, setSharing] = useState(false),
    [background, setBackground] = useState(false),
    [self, setSelf] = useState<Location.LocationObject | null>(null);
  const watcher = useRef<Location.LocationSubscription | null>(null),
    generation = useRef(0),
    sharingOperation = useRef(0),
    session = useRef({ token: "", sharing: false });
  const [title, setTitle] = useState(""),
    [email, setEmail] = useState(""),
    [partyId, setPartyId] = useState(""),
    [place, setPlace] = useState(""),
    [start, setStart] = useState(""),
    [end, setEnd] = useState(""),
    [size, setSize] = useState("4"),
    [interests, setInterests] = useState(""),
    [consent, setConsent] = useState(false);
  const [meals, setMeals] = useState<any>(null),
    [shuttle, setShuttle] = useState<any>(null),
    [route, setRoute] = useState("41946");
  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setMessage("");
    try {
      await action();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  async function clearLocation() {
    generation.current++;
    sharingOperation.current++;
    session.current.sharing = false;
    watcher.current?.remove();
    watcher.current = null;
    setSharing(false);
    setBackground(false);
    setPositions([]);
    setSelf(null);
    await setUploadConsent(false);
    await stopLocation();
  }
  useEffect(() => {
    onUnauthorized(() => {
      void SecureStore.deleteItemAsync(TOKEN_KEY);
      void clearLocation().catch(() => undefined);
      session.current.token = "";
      setToken("");
      setUser(null);
      setMessage("로그인이 만료되었습니다. 다시 로그인하세요.");
    });
    return () => onUnauthorized(undefined);
  }, []);
  const reload = useCallback(async () => {
    if (!token || token !== session.current.token) return;
    const epoch = ++generation.current;
    setPositions([]);
    const [e, p, f, q, l] = await Promise.all([
      request("/events", token),
      request("/parties", token),
      request("/friends", token),
      request("/quests", token),
      request("/locations", token),
    ]);
    if (epoch !== generation.current || token !== session.current.token) return;
    setEvents(e.items);
    setParties(p.items);
    setFriends(f.items);
    setQuests(q.items);
    if (
      canApplyLocations(
        { generation: epoch, token },
        {
          generation: generation.current,
          ...session.current,
          active: AppState.currentState === "active",
        },
      )
    )
      setPositions(freshLocations(l.items));
    if (MATCH) {
      const m = await request("/matches", token, "GET", undefined, MATCH);
      if (epoch === generation.current) setMatches(m.items);
    }
  }, [token]);
  useEffect(() => {
    run(async () => {
      await setUploadConsent(false);
      await stopLocation();
      const saved = await SecureStore.getItemAsync(TOKEN_KEY);
      if (saved) {
        try {
          const me = await request<User>("/auth/me", saved);
          await request("/me/location-sharing", saved, "PATCH", {
            enabled: false,
          });
          setUser(me);
          session.current.token = saved;
          setToken(saved);
        } catch {
          await SecureStore.deleteItemAsync(TOKEN_KEY);
        }
      }
    });
    return () => watcher.current?.remove();
  }, []);
  useEffect(() => {
    if (!token) return;
    const refresh = () => {
      setPositions([]);
      reload().catch((e) => {
        setPositions([]);
        setMessage(e.message);
      });
    };
    refresh();
    const socket = SOCKET ? io(SOCKET, { auth: { token } }) : null;
    socket?.on("connect", refresh);
    socket?.on("domain.changed", refresh);
    socket?.on("disconnect", () => {
      generation.current++;
      setPositions([]);
    });
    socket?.on("connect_error", () => {
      generation.current++;
      setPositions([]);
    });
    const timer = setInterval(refresh, 30000);
    const app = AppState.addEventListener("change", (state) => {
      generation.current++;
      setPositions([]);
      if (state === "active") refresh();
    });
    return () => {
      generation.current++;
      socket?.disconnect();
      clearInterval(timer);
      app.remove();
    };
  }, [token, reload]);
  useEffect(() => {
    if (!positions.length) return;
    const expiresAt = Math.min(
      ...positions.map((p) => Date.parse(p.observedAt) + LOCATION_TTL_MS),
    );
    const timeout = setTimeout(
      () => setPositions((items) => freshLocations(items)),
      Math.max(0, expiresAt - Date.now()),
    );
    return () => clearTimeout(timeout);
  }, [positions]);
  async function mutate(
    path: string,
    method: string,
    body?: unknown,
    base = API,
  ) {
    generation.current++;
    setPositions([]);
    await request(path, token, method, body, base);
    await reload();
  }
  async function login() {
    await GoogleSignin.hasPlayServices();
    const result = await GoogleSignin.signIn();
    if (result.type !== "success" || !result.data.idToken) return;
    const auth = await request("/auth/google", undefined, "POST", {
      idToken: result.data.idToken,
    });
    await SecureStore.setItemAsync(TOKEN_KEY, auth.accessToken);
    setUser(auth.user);
    session.current.token = auth.accessToken;
    setToken(auth.accessToken);
  }
  async function logout() {
    const previousToken = token;
    session.current.token = "";
    generation.current++;
    const clearing = clearLocation();
    setToken("");
    setUser(null);
    setEvents([]);
    setParties([]);
    setFriends([]);
    setQuests([]);
    setMatches([]);
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await clearing;
    await GoogleSignin.signOut().catch(() => undefined);
    await request("/me/location-sharing", previousToken, "PATCH", {
      enabled: false,
    });
  }
  async function toggleSharing(enabled: boolean) {
    if (!enabled) {
      await clearLocation();
      await request("/me/location-sharing", token, "PATCH", { enabled: false });
      return;
    }
    const operation = ++sharingOperation.current;
    const stillCurrent = () =>
      sharingOperation.current === operation && session.current.token === token;
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!stillCurrent()) return;
    if (permission.status !== "granted")
      throw new Error("위치 권한이 필요합니다.");
    await request("/me/location-sharing", token, "PATCH", { enabled: true });
    if (!stillCurrent()) {
      await request("/me/location-sharing", token, "PATCH", { enabled: false });
      return;
    }
    try {
      await setUploadConsent(true);
      if (!stillCurrent()) {
        await setUploadConsent(false);
        return;
      }
      session.current.sharing = true;
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 30000,
          distanceInterval: 20,
        },
        (location) => {
          if (!stillCurrent() || !session.current.sharing) return;
          setSelf(location);
          upload(token, location).catch((e) => {
            setMessage(e.message);
            setPositions([]);
          });
        },
      );
      if (!stillCurrent()) {
        subscription.remove();
        await setUploadConsent(false);
        return;
      }
      watcher.current = subscription;
      setSharing(true);
      await reload();
    } catch (e) {
      session.current.sharing = false;
      watcher.current?.remove();
      watcher.current = null;
      setSharing(false);
      setPositions([]);
      await setUploadConsent(false);
      await request("/me/location-sharing", token, "PATCH", { enabled: false });
      throw e;
    }
  }
  function dates() {
    const a = new Date(start),
      b = new Date(end);
    if (!Number.isFinite(+a) || !Number.isFinite(+b) || b <= a)
      throw new Error("시작/종료 ISO 날짜를 확인하세요.");
    return { startsAt: a.toISOString(), endsAt: b.toISOString() };
  }
  if (!token)
    return (
      <SafeAreaView style={s.root}>
        <View style={s.login}>
          <Text style={s.logo}>캠퍼스</Text>
          <Text style={s.heading}>오늘, 함께할 캠퍼스</Text>
          <Text>행사와 친구, 함께하는 약속을 한 곳에서.</Text>
          <Card>
            <Text>서울대학교 Google 계정으로 로그인하세요.</Text>
            {(!API || !WEB_CLIENT) && (
              <Text style={s.notice}>
                설정 필요: .env에 API 주소와 Google 웹 OAuth 클라이언트 ID를
                입력하세요. Android 개발 빌드가 필요합니다.
              </Text>
            )}
            <Button
              title="Google로 계속하기"
              disabled={busy || !API || !WEB_CLIENT}
              onPress={() => run(login)}
            />
          </Card>
          <Text style={s.notice}>{message}</Text>
        </View>
      </SafeAreaView>
    );
  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <Text style={s.logo}>캠퍼스</Text>
        <View style={s.row}>
          {user?.avatarUrl && (
            <Image source={{ uri: user.avatarUrl }} style={s.avatar} />
          )}
          <Text>{user?.displayName}</Text>
          <Button title="로그아웃" onPress={() => run(logout)} />
        </View>
      </View>
      <View style={s.tabs}>
        {["지도", "행사", "약속/파티", "생활"].map((t, i) => (
          <Button
            key={t}
            title={t}
            color={i === tab ? "#14796d" : "#777"}
            onPress={() => setTab(i)}
          />
        ))}
      </View>
      <ScrollView contentContainerStyle={s.content}>
        <Text accessibilityLiveRegion="polite" style={s.notice}>
          {busy ? "처리 중…" : message}
        </Text>
        <Button title="새로고침" disabled={busy} onPress={() => run(reload)} />
        {tab === 0 && (
          <>
            <Text style={s.heading}>우리의 캠퍼스</Text>
            {Constants.expoConfig?.extra?.mapsConfigured ? (
              <MapView
                style={s.map}
                provider={PROVIDER_GOOGLE}
                initialRegion={{
                  latitude: 37.4599,
                  longitude: 126.9524,
                  latitudeDelta: 0.025,
                  longitudeDelta: 0.025,
                }}
              >
                {self && (
                  <Marker
                    coordinate={self.coords}
                    title="나"
                    pinColor="#14796d"
                  />
                )}
                {positions
                  .filter((p) => Date.now() - Date.parse(p.observedAt) < 120000)
                  .map((p) => (
                    <Marker
                      key={p.user.id}
                      coordinate={p}
                      title={p.user.displayName}
                    >
                      {p.user.avatarUrl ? (
                        <Image
                          source={{ uri: p.user.avatarUrl }}
                          style={s.avatar}
                        />
                      ) : (
                        <View style={s.pin}>
                          <Text>{p.user.displayName.slice(0, 1)}</Text>
                        </View>
                      )}
                    </Marker>
                  ))}
                {events
                  .filter(
                    (e) =>
                      e.status === "published" &&
                      e.latitude !== null &&
                      e.longitude !== null,
                  )
                  .map((e) => (
                    <Marker
                      key={e.id}
                      coordinate={{
                        latitude: e.latitude!,
                        longitude: e.longitude!,
                      }}
                      title={e.title}
                      description={e.locationName}
                      pinColor="#df9440"
                    />
                  ))}
              </MapView>
            ) : (
              <Card>
                <Text>
                  Google Maps Android API 키 설정 후 개발 빌드를 다시
                  생성하세요.
                </Text>
              </Card>
            )}
            <Card>
              <Text style={s.heading}>위치 공유</Text>
              <View style={s.row}>
                <Text>내 위치 공유에 동의</Text>
                <Switch
                  value={sharing}
                  disabled={busy}
                  onValueChange={(v) => run(() => toggleSharing(v))}
                />
              </View>
              <Text>
                친구/파티 관계에서 양쪽이 켠 경우에만 표시됩니다. 파티 공유를
                꺼도 별도로 공유 중인 친구는 유지됩니다.
              </Text>
              <View style={s.row}>
                <Text>백그라운드 공유 (HTTPS 필요)</Text>
                <Switch
                  value={background}
                  disabled={!sharing || busy}
                  onValueChange={(v) =>
                    run(async () => {
                      const operation = sharingOperation.current;
                      if (v) await startBackground();
                      else await stopLocation();
                      if (
                        operation !== sharingOperation.current ||
                        token !== session.current.token ||
                        !session.current.sharing
                      ) {
                        await stopLocation();
                        setBackground(false);
                        return;
                      }
                      setBackground(v);
                    })
                  }
                />
              </View>
            </Card>
            {quests.map((q) => (
              <Card key={q.id}>
                <Text style={s.heading}>{q.title}</Text>
                <Text>
                  {q.locationName} ·{" "}
                  {new Date(q.startsAt).toLocaleString("ko-KR")}
                </Text>
              </Card>
            ))}
          </>
        )}
        {tab === 1 && (
          <>
            <Text style={s.heading}>캠퍼스 행사</Text>
            {!events.length && <Text>공개된 행사가 없습니다.</Text>}
            {events.map((e) => (
              <Card key={e.id}>
                <Text style={s.heading}>
                  {e.title} {e.status === "cancelled" ? "(취소)" : ""}
                </Text>
                <Text>{e.description}</Text>
                <Text>
                  {e.locationName} ·{" "}
                  {new Date(e.startsAt).toLocaleString("ko-KR")}
                </Text>
                <Button
                  title="함께 갈 파티 만들기"
                  disabled={busy || e.status !== "published"}
                  onPress={() =>
                    run(() =>
                      mutate("/parties", "POST", {
                        title: `${e.title} 함께 가요`,
                        eventId: e.id,
                        maxMembers: 4,
                      }),
                    )
                  }
                />
              </Card>
            ))}
          </>
        )}
        {tab === 2 && (
          <>
            <Text style={s.heading}>함께하는 약속</Text>
            <Card>
              <Text style={s.heading}>친구</Text>
              <Field value={email} set={setEmail} hint="친구 학교 이메일" />
              <Button
                title="친구 요청"
                disabled={busy || !email}
                onPress={() => run(() => mutate("/friends", "POST", { email }))}
              />
              {friends.map((f) => (
                <View key={f.id} style={s.section}>
                  <Text>
                    {f.user.displayName} ·{" "}
                    {f.status === "accepted" ? "친구" : "요청 대기"}
                  </Text>
                  {f.status === "pending" && f.direction === "incoming" && (
                    <Button
                      title="수락"
                      onPress={() =>
                        run(() => mutate(`/friends/${f.id}/accept`, "POST"))
                      }
                    />
                  )}{" "}
                  {f.status === "accepted" && (
                    <View style={s.row}>
                      <Text>이 친구와 위치 공유</Text>
                      <Switch
                        value={f.sharingEnabled}
                        disabled={busy}
                        onValueChange={(enabled) =>
                          run(() =>
                            mutate(`/friends/${f.id}/sharing`, "PATCH", {
                              enabled,
                            }),
                          )
                        }
                      />
                    </View>
                  )}
                </View>
              ))}
            </Card>
            <Card>
              <Text style={s.heading}>파티 찾기</Text>
              {parties.map((p) => (
                <View key={p.id} style={s.section}>
                  <Text>
                    {p.title} · 최대 {p.maxMembers}명
                  </Text>
                  {p.members.some((m) => m.id === user?.id) ? (
                    <>
                      <Text>
                        {p.members.map((m) => m.displayName).join(", ")}
                      </Text>
                      <View style={s.row}>
                        <Button
                          title="약속 작성"
                          onPress={() => setPartyId(p.id)}
                        />
                        <Button
                          title="탈퇴"
                          onPress={() =>
                            run(() =>
                              mutate(`/parties/${p.id}/membership`, "DELETE"),
                            )
                          }
                        />
                      </View>
                      <View style={s.row}>
                        <Text>파티 위치 공유 (본인 설정)</Text>
                        <Switch
                          value={p.sharingEnabled === true}
                          disabled={busy || p.sharingEnabled === undefined}
                          onValueChange={(enabled) =>
                            run(() =>
                              mutate(`/parties/${p.id}/sharing`, "PATCH", {
                                enabled,
                              }),
                            )
                          }
                        />
                      </View>
                      {p.sharingEnabled === undefined && (
                        <Text>공유 설정을 다시 불러오세요.</Text>
                      )}
                    </>
                  ) : (
                    <Button
                      title="파티 참여"
                      disabled={busy}
                      onPress={() =>
                        run(() => mutate(`/parties/${p.id}/join`, "POST"))
                      }
                    />
                  )}
                </View>
              ))}
            </Card>
            <Card>
              <Text style={s.heading}>새 파티 / 공동 약속 / 매칭</Text>
              <Field value={title} set={setTitle} hint="활동 이름" />
              <Field value={size} set={setSize} hint="인원 수" />
              <Button
                title="파티 만들기"
                disabled={busy || !title}
                onPress={() =>
                  run(() =>
                    mutate("/parties", "POST", {
                      title,
                      maxMembers: Number(size),
                    }),
                  )
                }
              />
              <Text>
                약속 대상:{" "}
                {parties.find((p) => p.id === partyId)?.title ||
                  "위에서 파티를 선택하세요"}
              </Text>
              <Field value={place} set={setPlace} hint="장소" />
              <Field
                value={start}
                set={setStart}
                hint="시작 (2026-09-28T12:00:00+09:00)"
              />
              <Field
                value={end}
                set={setEnd}
                hint="종료 (2026-09-28T13:00:00+09:00)"
              />
              <Button
                title="공동 약속 저장"
                disabled={busy || !partyId || !title}
                onPress={() =>
                  run(() =>
                    mutate("/quests", "POST", {
                      partyId,
                      title,
                      locationName: place,
                      ...dates(),
                    }),
                  )
                }
              />
              <Field
                value={interests}
                set={setInterests}
                hint="관심사 (쉼표로 구분)"
              />
              <View style={s.row}>
                <Text style={{ flex: 1 }}>
                  입력 조건에 맞는 새 파티 자동 가입에 동의합니다. 위치 권한
                  동의는 별도입니다.
                </Text>
                <Switch value={consent} onValueChange={setConsent} />
              </View>
              <Button
                title="동행 매칭 신청"
                disabled={busy || !consent || !MATCH || !title}
                onPress={() =>
                  run(() => {
                    const d = dates();
                    return mutate(
                      "/matches",
                      "POST",
                      {
                        activity: title,
                        timeStart: d.startsAt,
                        timeEnd: d.endsAt,
                        partySize: Number(size),
                        interests: interests
                          .split(",")
                          .map((t) => t.trim())
                          .filter(Boolean),
                        autoJoinConsent: true,
                      },
                      MATCH,
                    );
                  })
                }
              />
              {!MATCH && <Text>매칭 서버 주소 설정이 필요합니다.</Text>}
            </Card>
            {matches.map((m) => (
              <Card key={m.id}>
                <Text style={s.heading}>
                  {m.activity} · {m.status}
                </Text>
                <Text>
                  {m.explanation ||
                    m.aiStatus ||
                    "매칭 상태는 서버에서 확인합니다."}
                </Text>
                {m.status === "searching" && (
                  <Button
                    title="신청 취소"
                    onPress={() =>
                      run(() =>
                        mutate(`/matches/${m.id}`, "DELETE", undefined, MATCH),
                      )
                    }
                  />
                )}
              </Card>
            ))}
            {quests.map((q) => (
              <Card key={q.id}>
                <Text style={s.heading}>{q.title}</Text>
                <Text>
                  {q.locationName} ·{" "}
                  {new Date(q.startsAt).toLocaleString("ko-KR")}
                </Text>
                <Button
                  title="위 입력 내용으로 약속 변경"
                  disabled={busy || !title}
                  onPress={() =>
                    run(() =>
                      mutate(`/quests/${q.id}`, "PATCH", {
                        title,
                        locationName: place,
                        ...dates(),
                      }),
                    )
                  }
                />
              </Card>
            ))}
          </>
        )}
        {tab === 3 && (
          <>
            <Text style={s.heading}>캠퍼스 생활</Text>
            <Card>
              <Button
                title="오늘 식단 조회"
                onPress={() =>
                  run(async () => {
                    const date = new Intl.DateTimeFormat("sv-SE", {
                      timeZone: "Asia/Seoul",
                    }).format(new Date());
                    setMeals(
                      await request(`/campus/meals?date=${date}`, token),
                    );
                  })
                }
              />
              {meals && (
                <>
                  <Text>
                    {meals.date} · {meals.status} {meals.message}
                  </Text>
                  {meals.items.map((m: any, i: number) => (
                    <View key={i} style={s.section}>
                      <Text style={s.heading}>{m.restaurant}</Text>
                      <Text>아침: {m.breakfast || "정보 없음"}</Text>
                      <Text>점심: {m.lunch || "정보 없음"}</Text>
                      <Text>저녁: {m.dinner || "정보 없음"}</Text>
                    </View>
                  ))}
                  <Text>출처: {meals.sourceUrl}</Text>
                  <Text>조회: {meals.fetchedAt}</Text>
                </>
              )}
            </Card>
            <Card>
              <Text style={s.heading}>셔틀 노선도</Text>
              <View style={s.row}>
                {["41946", "41914"].map((r) => (
                  <Button
                    key={r}
                    title={`${r}${route === r ? " ✓" : ""}`}
                    onPress={() => {
                      setRoute(r);
                      setShuttle(null);
                    }}
                  />
                ))}
              </View>
              <Button
                title="셔틀 위치 조회"
                onPress={() =>
                  run(async () =>
                    setShuttle(
                      await request(`/campus/shuttle?routeId=${route}`, token),
                    ),
                  )
                }
              />
              {shuttle && (
                <>
                  <Text>
                    {shuttle.status} · {shuttle.message}
                  </Text>
                  <Text>
                    노선도 픽셀 좌표이며 GPS/도착 예상 시간이 아닙니다.
                  </Text>
                  <ScrollView horizontal>
                    <View
                      style={{
                        width: Math.max(
                          400,
                          ...shuttle.stops.map((v: any) => v.x + 140),
                          ...shuttle.vehicles.map((v: any) => v.x + 140),
                        ),
                        height: Math.max(
                          300,
                          ...shuttle.stops.map((v: any) => v.y + 45),
                          ...shuttle.vehicles.map((v: any) => v.y + 45),
                        ),
                        backgroundColor: "#eef2ef",
                      }}
                    >
                      {shuttle.stops.map((v: any, i: number) => (
                        <Text
                          key={`s${i}`}
                          style={{
                            position: "absolute",
                            left: v.x,
                            top: v.y,
                            fontSize: 11,
                          }}
                        >
                          ○ {v.name}
                        </Text>
                      ))}
                      {shuttle.vehicles.map((v: any) => (
                        <Text
                          key={v.id}
                          style={{
                            position: "absolute",
                            left: v.x,
                            top: v.y,
                            color: "#14796d",
                            backgroundColor: "#fff",
                          }}
                        >
                          ● {v.label || v.id}
                        </Text>
                      ))}
                    </View>
                  </ScrollView>
                  <Text>출처: {shuttle.sourceUrl}</Text>
                  <Text>조회: {shuttle.fetchedAt} · 원본 관측 시각 미제공</Text>
                </>
              )}
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f3f5ef" },
  login: { flex: 1, justifyContent: "center", padding: 25, gap: 18 },
  logo: { color: "#14796d", fontWeight: "800", fontSize: 27 },
  heading: {
    fontSize: 19,
    fontWeight: "700",
    marginBottom: 8,
    color: "#20352f",
  },
  header: { padding: 16, gap: 5 },
  tabs: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "white",
    paddingVertical: 8,
  },
  content: { padding: 16, gap: 13, paddingBottom: 50 },
  card: { backgroundColor: "white", padding: 17, borderRadius: 17, gap: 9 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  input: {
    borderColor: "#cdd7cf",
    borderWidth: 1,
    borderRadius: 9,
    padding: 11,
    backgroundColor: "#fff",
  },
  notice: { color: "#9e4b25", lineHeight: 21 },
  map: { height: 350, borderRadius: 20 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  pin: { padding: 8, backgroundColor: "#b0e0c9", borderRadius: 20 },
  section: {
    paddingVertical: 12,
    gap: 7,
    borderTopWidth: 1,
    borderTopColor: "#ecf0ea",
  },
});
