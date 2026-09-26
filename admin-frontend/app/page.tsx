"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
const API = process.env.NEXT_PUBLIC_API_URL || "";
const GOOGLE = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
type Event = {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  locationName: string;
  latitude: number | null;
  longitude: number | null;
  status: "draft" | "published" | "cancelled";
  sourceUrl: string | null;
};
type Form = {
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  locationName: string;
  latitude: string;
  longitude: string;
  status: Event["status"];
  sourceUrl: string;
};
const empty: Form = {
  title: "",
  description: "",
  startsAt: "",
  endsAt: "",
  locationName: "",
  latitude: "",
  longitude: "",
  status: "draft",
  sourceUrl: "",
};
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (result: { credential: string }) => void;
            hd: string;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: { theme: string; size: string; text: string },
          ) => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}
export default function Page() {
  const [token, setToken] = useState(""),
    [name, setName] = useState(""),
    [events, setEvents] = useState<Event[]>([]),
    [integrations, setIntegrations] = useState<unknown>(null),
    [form, setForm] = useState<Form>(empty),
    [editing, setEditing] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [googleReady, setGoogleReady] = useState(false);
  const googleButton = useRef<HTMLDivElement>(null);
  async function api(
    path: string,
    method = "GET",
    body?: unknown,
    access = token,
  ) {
    if (!API) throw new Error("NEXT_PUBLIC_API_URL 설정이 필요합니다.");
    const response = await fetch(`${API}/v1${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(access ? { Authorization: `Bearer ${access}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) {
      if (response.status === 401) {
        setToken("");
        setEvents([]);
        setIntegrations(null);
      }
      throw new Error(result.message || `요청 실패 (${response.status})`);
    }
    return result;
  }
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
  async function reload() {
    const [e, i] = await Promise.all([
      api("/admin/events"),
      api("/admin/integrations"),
    ]);
    setEvents(e.items);
    setIntegrations(i);
  }
  const login = useCallback(async (credential: string) => {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`${API}/v1/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: credential }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "로그인 실패");
      if (result.user.role !== "admin")
        throw new Error(
          "관리자 권한이 없는 계정입니다. 서버 ADMIN_EMAILS 설정을 확인하세요.",
        );
      setToken(result.accessToken);
      setName(result.user.displayName);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    if (googleReady && !token && GOOGLE && API && googleButton.current) {
      window.google?.accounts.id.initialize({
        client_id: GOOGLE,
        callback: (r) => void login(r.credential),
        hd: "snu.ac.kr",
      });
      window.google?.accounts.id.renderButton(googleButton.current, {
        theme: "outline",
        size: "large",
        text: "signin_with",
      });
    }
  }, [googleReady, token, login]);
  useEffect(() => {
    if (token) void run(reload);
  }, [token]);
  function edit(event: Event) {
    setEditing(event.id);
    setForm({
      ...event,
      latitude: event.latitude === null ? "" : String(event.latitude),
      longitude: event.longitude === null ? "" : String(event.longitude),
      sourceUrl: event.sourceUrl || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function save() {
    const startsAt = new Date(form.startsAt),
      endsAt = new Date(form.endsAt);
    if (
      !Number.isFinite(+startsAt) ||
      !Number.isFinite(+endsAt) ||
      endsAt <= startsAt
    )
      throw new Error("행사 시작/종료 시간을 확인하세요.");
    const latitude = form.latitude.trim() === "" ? null : Number(form.latitude),
      longitude = form.longitude.trim() === "" ? null : Number(form.longitude);
    if (
      (latitude === null) !== (longitude === null) ||
      (latitude !== null &&
        (!Number.isFinite(latitude) || Math.abs(latitude) > 90)) ||
      (longitude !== null &&
        (!Number.isFinite(longitude) || Math.abs(longitude) > 180))
    )
      throw new Error("위도와 경도를 함께 올바르게 입력하세요.");
    await api(
      `/admin/events${editing ? `/${editing}` : ""}`,
      editing ? "PATCH" : "POST",
      {
        ...form,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        latitude,
        longitude,
        sourceUrl: form.sourceUrl.trim() || null,
      },
    );
    setEditing("");
    setForm(empty);
    await reload();
    setMessage("행사를 저장했습니다.");
  }
  const field = (key: keyof Form, label: string, required = false) => (
    <label>
      {label}
      <input
        value={form[key]}
        required={required}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </label>
  );
  return (
    <main>
      <header>
        <div>
          <span className="eyebrow">CAMPUS OPERATIONS</span>
          <h1>캠퍼스 운영</h1>
          <p>행사와 생활 정보의 신뢰할 수 있는 출발점</p>
        </div>
        {token && (
          <div>
            {name}
            <button
              onClick={() => {
                setToken("");
                setName("");
                setEvents([]);
                setIntegrations(null);
                setForm(empty);
                window.google?.accounts.id.disableAutoSelect();
              }}
            >
              로그아웃
            </button>
          </div>
        )}
      </header>
      <div role="status" className="notice">
        {busy ? "처리 중…" : message}
      </div>
      {!token ? (
        <section className="login">
          <h2>운영자 로그인</h2>
          <p>서버에 등록된 서울대학교 관리자 계정으로 로그인하세요.</p>
          {!API || !GOOGLE ? (
            <div className="configuration">
              <strong>Google 로그인 설정이 필요합니다.</strong>
              <p>
                서비스를 실행하기 전에 NEXT_PUBLIC_API_URL과
                NEXT_PUBLIC_GOOGLE_CLIENT_ID를 지정하세요. Docker에서는 빌드
                인자로 전달하고 이미지를 다시 빌드해야 합니다.
              </p>
            </div>
          ) : (
            <>
              <Script
                src="https://accounts.google.com/gsi/client"
                strategy="afterInteractive"
                onReady={() => setGoogleReady(true)}
                onError={() =>
                  setMessage(
                    "Google 로그인 스크립트를 불러오지 못했습니다. 네트워크 연결을 확인하세요.",
                  )
                }
              />
              <div ref={googleButton} />
            </>
          )}
        </section>
      ) : (
        <>
          <div className="toolbar">
            <h2>행사 관리</h2>
            <button disabled={busy} onClick={() => void run(reload)}>
              새로고침
            </button>
          </div>
          <div className="columns">
            <section>
              <h2>{editing ? "행사 수정" : "새 행사"}</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(save);
                }}
              >
                {field("title", "제목", true)}
                <label>
                  설명
                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                  />
                </label>
                {field(
                  "startsAt",
                  "시작 — ISO 날짜 (예: 2026-09-28T12:00:00+09:00)",
                  true,
                )}
                {field("endsAt", "종료 — ISO 날짜", true)}
                {field("locationName", "장소", true)}
                <div className="two">
                  {field("latitude", "위도 (선택)")}
                  {field("longitude", "경도 (선택)")}
                </div>
                {field("sourceUrl", "출처 URL (선택)")}
                <label>
                  공개 상태
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        status: e.target.value as Form["status"],
                      })
                    }
                  >
                    <option value="draft">초안</option>
                    <option value="published">공개</option>
                    <option value="cancelled">취소</option>
                  </select>
                </label>
                <div className="actions">
                  <button className="primary" disabled={busy} type="submit">
                    저장
                  </button>
                  {editing && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditing("");
                        setForm(empty);
                      }}
                    >
                      수정 취소
                    </button>
                  )}
                </div>
              </form>
            </section>
            <section>
              <h2>
                등록된 행사 <span className="count">{events.length}</span>
              </h2>
              {!events.length && <p>등록된 행사가 없습니다.</p>}
              {events.map((e) => (
                <article key={e.id}>
                  <span className={`badge ${e.status}`}>
                    {
                      { draft: "초안", published: "공개", cancelled: "취소" }[
                        e.status
                      ]
                    }
                  </span>
                  <h3>{e.title}</h3>
                  <p>
                    {e.locationName} ·{" "}
                    {new Date(e.startsAt).toLocaleString("ko-KR")}
                  </p>
                  <p>{e.description}</p>
                  <div className="actions">
                    <button disabled={busy} onClick={() => edit(e)}>
                      수정
                    </button>
                    {e.status !== "published" && (
                      <button
                        disabled={busy}
                        onClick={() =>
                          void run(async () => {
                            await api(`/admin/events/${e.id}`, "PATCH", {
                              status: "published",
                            });
                            await reload();
                          })
                        }
                      >
                        공개
                      </button>
                    )}
                    {e.status !== "cancelled" && (
                      <button
                        disabled={busy}
                        onClick={() =>
                          void run(async () => {
                            await api(`/admin/events/${e.id}`, "PATCH", {
                              status: "cancelled",
                            });
                            await reload();
                          })
                        }
                      >
                        행사 취소
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </section>
          </div>
          <section>
            <div className="toolbar">
              <div>
                <h2>외부 정보 수집</h2>
                <p>실제 제공처의 응답 및 서버 수집 상태입니다.</p>
              </div>
              <div className="actions">
                {["events", "meals", "shuttle"].map((source) => (
                  <button
                    key={source}
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        await api(
                          `/admin/integrations/${source}/refresh`,
                          "POST",
                        );
                        await reload();
                        setMessage(
                          "새로고침을 요청했습니다. 수집 완료 후 다시 조회하세요.",
                        );
                      })
                    }
                  >
                    {{ events: "행사", meals: "식단", shuttle: "셔틀" }[source]}{" "}
                    새로고침
                  </button>
                ))}
              </div>
            </div>
            <pre>{JSON.stringify(integrations, null, 2)}</pre>
          </section>
        </>
      )}
    </main>
  );
}
