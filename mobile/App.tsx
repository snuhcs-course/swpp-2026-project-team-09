import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, StatusBar, StyleSheet, Text, View } from "react-native";
import {
  SafeAreaProvider,
  SafeAreaView,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import { isCurrentSession } from "./src/session";
import Experience from "./src/ui/Experience";
import { Action, Card, colors, u } from "./src/ui/Primitives";
import { createRefreshQueue } from "./src/refresh-queue";
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { io } from "socket.io-client";
import {
  API,
  ApiError,
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
  MatchRequest,
  Meetup,
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
export default function App() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <StatusBar barStyle="dark-content" />
      <CampusApp />
    </SafeAreaProvider>
  );
}
function CampusApp() {
  const [token, setToken] = useState(""),
    [user, setUser] = useState<User | null>(null),
    [loaded, setLoaded] = useState(false),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const [events, setEvents] = useState<Event[]>([]),
    [parties, setParties] = useState<Party[]>([]),
    [friends, setFriends] = useState<Friend[]>([]),
    [quests, setQuests] = useState<Quest[]>([]),
    [positions, setPositions] = useState<Position[]>([]),
    [matches, setMatches] = useState<MatchRequest[]>([]),
    [meetups, setMeetups] = useState<Meetup[]>([]);
  const [sharing, setSharing] = useState(false),
    [background, setBackground] = useState(false),
    [self, setSelf] = useState<Location.LocationObject | null>(null);
  const watcher = useRef<Location.LocationSubscription | null>(null),
    generation = useRef(0),
    sharingOperation = useRef(0),
    session = useRef({ token: "", sharing: false });
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
  function clearAccountData() {
    setEvents([]);
    setParties([]);
    setFriends([]);
    setQuests([]);
    setMatches([]);
    setMeetups([]);
    setLoaded(false);
  }
  useEffect(() => {
    onUnauthorized((failedToken) => {
      if (!isCurrentSession(failedToken, session.current.token)) return;
      clearAccountData();
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
    if (!isCurrentSession(token, session.current.token)) return;
    const epoch = ++generation.current;
    setPositions([]);
    const [e, p, f, q, l, plans] = await Promise.all([
      request("/events", token),
      request("/parties", token),
      request("/friends", token),
      request("/quests", token),
      request("/locations", token),
      request("/meetups", token),
    ]);
    if (
      epoch !== generation.current ||
      !isCurrentSession(token, session.current.token)
    )
      return;
    setEvents(e.items);
    setParties(p.items);
    setFriends(f.items);
    setQuests(q.items);
    setMeetups(plans.items);
    setLoaded(true);
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
    const queue = createRefreshQueue(reload, (error) => {
      setPositions([]);
      setMessage(error instanceof Error ? error.message : String(error));
    });
    const refresh = () => {
      generation.current++;
      setPositions([]);
      queue.request();
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
      queue.dispose();
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
    let result;
    try {
      result = await request(path, token, method, body, base);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        await reload().catch(() => undefined);
        throw new Error(
          error.code === "SCHEDULE_CONFLICT"
            ? "등록된 일정과 겹쳐 이 계획을 확정할 수 없어요. 각자 시간표와 공동 약속을 확인하고 다른 시간으로 제안해 주세요."
            : "내용이 변경되었거나 현재 요청을 처리할 수 없습니다. 최신 상태를 확인한 뒤 다시 시도해 주세요.",
        );
      }
      throw error;
    }
    if (!isCurrentSession(token, session.current.token)) return result;
    if (path === "/parties" || /^\/parties\/[^/]+\/join$/.test(path)) {
      setParties((items) => [
        ...items.filter((item) => item.id !== result.id),
        result as Party,
      ]);
    }
    if (path === "/quests" || /^\/quests\/[^/]+$/.test(path)) {
      setQuests((items) => [
        ...items.filter((item) => item.id !== result.id),
        result as Quest,
      ]);
    }
    if (path === "/meetups" || /^\/meetups\/[^/]+\/respond$/.test(path)) {
      setMeetups((items) => [
        ...items.filter((item) => item.id !== result.id),
        result as Meetup,
      ]);
    }
    await reload().catch(
      () =>
        isCurrentSession(token, session.current.token) &&
        setMessage(
          "요청은 저장되었습니다. 최신 목록을 불러오지 못했으니 새로고침해 주세요.",
        ),
    );
    return result;
  }
  async function login() {
    await GoogleSignin.hasPlayServices();
    let result;
    try {
      result = await GoogleSignin.signIn();
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        String(error.code) === "10"
      ) {
        throw new Error(
          "Google 로그인 설정을 확인해 주세요. Android 앱 패키지·서명 SHA-1과 웹 OAuth 클라이언트가 같은 프로젝트에 등록되어야 합니다. 설정 반영 후 다시 시도해 주세요.",
        );
      }
      if (
        typeof error === "object" &&
        error !== null &&
        (("code" in error && String(error.code) === "8") ||
          ("message" in error && error.message === "INTERNAL_ERROR"))
      ) {
        throw new Error(
          "Google 인증을 완료하지 못했습니다. 잠시 후 다시 시도하고, 계속 실패하면 기기의 Google 계정과 Play 서비스 상태를 확인해 주세요.",
        );
      }
      throw error;
    }
    if (result.type !== "success" || !result.data.idToken) return;
    const auth = await request("/auth/google", undefined, "POST", {
      idToken: result.data.idToken,
    });
    await SecureStore.setItemAsync(TOKEN_KEY, auth.accessToken);
    clearAccountData();
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
    clearAccountData();
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
  async function toggleBackground(enabled: boolean) {
    const operation = sharingOperation.current;
    if (enabled) await startBackground();
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
    setBackground(enabled);
  }
  if (!token || !user)
    return (
      <SafeAreaView style={styles.loginRoot}>
        <View style={styles.loginTop}>
          <Text style={styles.logo}>캠퍼스</Text>
          <Text style={styles.tagline}>같은 캠퍼스, 새로운 연결</Text>
        </View>
        <View style={styles.loginBody}>
          <View style={styles.symbol}>
            <Text style={{ fontSize: 62, color: colors.teal }}>◎</Text>
          </View>
          <Text style={styles.welcome}>오늘의 캠퍼스,{"\n"}함께할 사람들.</Text>
          <Text style={u.body}>
            관심 있는 행사와 친구의 약속을 발견하고,{"\n"}우리만의 캠퍼스 생활을
            시작하세요.
          </Text>
          <Card>
            <Text style={u.title}>학교 계정으로 시작하기</Text>
            <Text style={u.body}>
              서울대학교 Google 계정으로 로그인해 주세요.
            </Text>
            {(!API || !WEB_CLIENT) && (
              <Text style={u.error}>
                로그인 설정이 필요합니다. API 주소와 Google OAuth 클라이언트를
                구성한 Android 개발 빌드에서 사용할 수 있습니다.
              </Text>
            )}
            <Action
              label={busy ? "로그인 확인 중…" : "Google로 계속하기"}
              disabled={busy || !API || !WEB_CLIENT}
              onPress={() => void run(login)}
            />
          </Card>
          {!!message && (
            <Text accessibilityLiveRegion="polite" style={u.error}>
              {message}
            </Text>
          )}
        </View>
        <Text style={styles.loginFoot}>
          위치는 직접 공유를 켰을 때만 수집합니다.
        </Text>
      </SafeAreaView>
    );
  return (
    <Experience
      key={`${user.id}:${token}`}
      token={token}
      user={user}
      events={events}
      parties={parties}
      friends={friends}
      quests={quests}
      positions={positions}
      matches={matches}
      meetups={meetups}
      self={self?.coords ?? null}
      sharing={sharing}
      background={background}
      busy={busy}
      message={message}
      loaded={loaded}
      run={run}
      mutate={mutate}
      onRefresh={reload}
      onLogout={logout}
      onSharing={toggleSharing}
      onBackground={toggleBackground}
      onProfileSaved={(profile) => {
        if (isCurrentSession(token, session.current.token))
          setUser((current) =>
            current
              ? { ...current, displayName: profile.displayName }
              : current,
          );
      }}
      clearMessage={() => setMessage("")}
    />
  );
}
const styles = StyleSheet.create({
  loginRoot: { flex: 1, backgroundColor: colors.cream },
  loginTop: { paddingHorizontal: 27, paddingTop: 25 },
  logo: {
    fontSize: 29,
    fontWeight: "800",
    color: colors.teal,
    letterSpacing: -1,
  },
  tagline: { fontSize: 12, color: colors.muted, marginTop: 5 },
  loginBody: { flex: 1, justifyContent: "center", padding: 27, gap: 21 },
  symbol: {
    height: 98,
    width: 98,
    borderRadius: 32,
    backgroundColor: "#e2ecdf",
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-8deg" }],
  },
  welcome: {
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 43,
    color: colors.dark,
    letterSpacing: -1,
  },
  loginFoot: {
    textAlign: "center",
    color: colors.muted,
    fontSize: 11,
    padding: 20,
  },
});
