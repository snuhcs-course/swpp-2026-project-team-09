import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";
import { ApiError, PrivateEvent, request } from "../api";
import { initialTimes, timeRange } from "../forms";
import {
  privateEventBody,
  privateEventDeleteBody,
  privateEventRevisionChanged,
} from "../private-events";
import { createRefreshQueue } from "../refresh-queue";
import { Action, Card, Empty, Field, colors, u } from "./Primitives";
import { ImageImport, ExtractionReview } from "./ImageImport";
import { eventImageTimes, eventImageSaveSource } from "../image-extraction";
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
export function PrivateEvents({
  token,
  revision,
  onBusyChange,
}: {
  token: string;
  revision: number;
  onBusyChange: (busy: boolean) => void;
}) {
  const [items, setItems] = useState<PrivateEvent[]>([]),
    [loaded, setLoaded] = useState(false),
    [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [needsReload, setNeedsReload] = useState(false);
  const [editor, setEditor] = useState<{
    original: PrivateEvent | null;
  } | null>(null);
  const mounted = useRef(false),
    mutationLock = useRef(false),
    epoch = useRef(0),
    deferredRefresh = useRef(false),
    queue = useRef<ReturnType<typeof createRefreshQueue> | null>(null);
  const load = useCallback(
    async (duringConflict = false) => {
      if (mutationLock.current && !duringConflict) {
        deferredRefresh.current = true;
        return;
      }
      const current = ++epoch.current;
      setLoading(true);
      try {
        const result = await request<{ items: PrivateEvent[] }>(
          "/private-events",
          token,
        );
        if (mounted.current && current === epoch.current) {
          setItems(result.items);
          setLoaded(true);
          setNeedsReload(false);
        }
      } catch (e) {
        if (mounted.current && current === epoch.current)
          setMessage(
            e instanceof Error ? e.message : "일정을 불러오지 못했어요.",
          );
      } finally {
        if (mounted.current && current === epoch.current) setLoading(false);
      }
    },
    [token],
  );
  useEffect(() => {
    mounted.current = true;
    queue.current = createRefreshQueue(
      () => load(),
      () => undefined,
    );
    queue.current.request();
    return () => {
      mounted.current = false;
      epoch.current++;
      queue.current?.dispose();
    };
  }, [load]);
  useEffect(() => {
    queue.current?.request();
  }, [revision]);
  async function mutate(
    method: "POST" | "PATCH" | "DELETE",
    original: PrivateEvent | null,
    body: unknown,
  ) {
    if (mutationLock.current || !mounted.current) return;
    mutationLock.current = true;
    epoch.current++;
    setLoading(false);
    setBusy(true);
    onBusyChange(true);
    setMessage("");
    try {
      const result = await request<PrivateEvent | { ok: true }>(
        original ? `/private-events/${original.id}` : "/private-events",
        token,
        method,
        body,
      );
      if (!mounted.current) return;
      if (method === "DELETE")
        setItems((current) =>
          current.filter((item) => item.id !== original!.id),
        );
      else {
        const saved = result as PrivateEvent;
        setItems((current) => [
          ...current.filter((item) => item.id !== saved.id),
          saved,
        ]);
        setEditor(null);
      }
      setMessage(
        method === "DELETE"
          ? "개인 일정을 삭제했어요."
          : "개인 일정을 저장했어요.",
      );
      setNeedsReload(false);
    } catch (e) {
      if (!mounted.current) return;
      if (e instanceof ApiError && (e.status === 409 || e.status === 404)) {
        setNeedsReload(true);
        setMessage(
          "다른 곳에서 변경되거나 삭제된 일정이에요. 입력은 유지했어요. 최신 저장본을 확인한 뒤 다시 결정해 주세요.",
        );
        await load(true);
      } else
        setMessage(
          e instanceof Error ? e.message : "일정을 저장하지 못했어요.",
        );
    } finally {
      mutationLock.current = false;
      if (mounted.current) {
        setBusy(false);
        onBusyChange(false);
        if (deferredRefresh.current) {
          deferredRefresh.current = false;
          queue.current?.request();
        }
      }
    }
  }
  function remove(event: PrivateEvent) {
    Alert.alert(
      "이 개인 일정을 삭제할까요?",
      `${event.title}\n${stamp(event.startsAt)} ~ ${stamp(event.endsAt)}\n${event.locationName || "장소 없음"}\n삭제하면 되돌릴 수 없어요.`,
      [
        { text: "유지하기", style: "cancel" },
        {
          text: "일정 삭제",
          style: "destructive",
          onPress: () =>
            void mutate("DELETE", event, privateEventDeleteBody(event)),
        },
      ],
    );
  }
  return (
    <>
      <Text style={u.body}>
        나만 볼 수 있는 개인 일정이에요. 등록된 시간은 약속 계획을 확정할 때
        일정 충돌 확인에 사용돼요. 등록하지 않은 일정과 이동 시간은 직접 확인해
        주세요.
      </Text>
      {loading && (
        <ActivityIndicator
          color={colors.teal}
          accessibilityLabel="개인 일정 불러오는 중"
        />
      )}
      {!!message && (
        <Text style={u.error} accessibilityLiveRegion="polite">
          {message}
        </Text>
      )}
      <Action
        secondary
        small
        label="최신 개인 일정 불러오기"
        disabled={busy || loading}
        onPress={() => {
          setMessage("");
          queue.current?.request();
        }}
      />
      {editor ? (
        <PrivateEventForm
          token={token}
          key={editor.original?.id ?? "new"}
          original={editor.original}
          latest={items.find((item) => item.id === editor.original?.id)}
          busy={busy}
          blocked={needsReload}
          onSave={(original, body) =>
            void mutate(original ? "PATCH" : "POST", original, body)
          }
          onCancel={() => {
            if (!mutationLock.current) setEditor(null);
          }}
        />
      ) : (
        <>
          <Action
            label="개인 일정 추가"
            disabled={busy || !loaded}
            onPress={() => {
              setMessage("");
              setEditor({ original: null });
            }}
          />
          {!items.length && (
            <Empty
              title={
                loaded
                  ? "등록한 개인 일정이 없어요"
                  : "개인 일정을 확인하고 있어요"
              }
              detail={
                loaded
                  ? "수업 외에 비워 둘 시간이나 개인 약속을 기록해 보세요."
                  : "연결 상태를 확인한 뒤 다시 불러올 수 있어요."
              }
            />
          )}
          {[...items]
            .sort(
              (a, b) =>
                Number(Date.parse(a.endsAt) < Date.now()) -
                  Number(Date.parse(b.endsAt) < Date.now()) ||
                Date.parse(a.startsAt) - Date.parse(b.startsAt),
            )
            .map((event) => (
              <Card key={event.id}>
                <Text style={u.badge}>
                  나만 보기
                  {Date.parse(event.endsAt) < Date.now() ? " · 지난 일정" : ""}
                </Text>
                <Text style={u.title}>{event.title}</Text>
                <EventDetails event={event} />
                <View style={u.row}>
                  <Action
                    secondary
                    small
                    label="수정"
                    disabled={busy || needsReload}
                    onPress={() => {
                      setMessage("");
                      setEditor({ original: event });
                    }}
                  />
                  <Action
                    secondary
                    small
                    label="삭제"
                    disabled={busy || needsReload}
                    onPress={() => remove(event)}
                  />
                </View>
              </Card>
            ))}
        </>
      )}
    </>
  );
}
function EventDetails({ event }: { event: PrivateEvent }) {
  return (
    <>
      <Text style={u.body}>
        시작: {stamp(event.startsAt)}
        {"\n"}종료: {stamp(event.endsAt)}
        {"\n"}장소: {event.locationName || "없음"}
      </Text>
      {!!event.description && <Text style={u.body}>{event.description}</Text>}
    </>
  );
}
function PrivateEventForm({
  token,
  original,
  latest,
  busy: saving,
  blocked,
  onSave,
  onCancel,
}: {
  token: string;
  original: PrivateEvent | null;
  latest: PrivateEvent | undefined;
  busy: boolean;
  blocked: boolean;
  onSave: (
    original: PrivateEvent | null,
    body: ReturnType<typeof privateEventBody>,
  ) => void;
  onCancel: () => void;
}) {
  const [baseline, setBaseline] = useState(original),
    [title, setTitle] = useState(original?.title ?? ""),
    [description, setDescription] = useState(original?.description ?? ""),
    [place, setPlace] = useState(original?.locationName ?? ""),
    [times, setTimes] = useState(() =>
      initialTimes(original?.startsAt, original?.endsAt),
    ),
    [error, setError] = useState("");
  const [importing, setImporting] = useState(false),
    [review, setReview] = useState<string[] | null>(null),
    [previewReset, setPreviewReset] = useState(0);
  const busy = saving || importing;
  const changed = privateEventRevisionChanged(baseline, latest);
  return (
    <View style={{ gap: 16 }}>
      <Text style={u.title}>
        {original ? "개인 일정 수정" : "새 개인 일정"}
      </Text>
      <ImageImport
        token={token}
        kind="event"
        disabled={saving || blocked || changed}
        resetGeneration={previewReset}
        onBusyChange={setImporting}
        onExtracted={(result) => {
          if (result.kind !== "event") return;
          setTitle(result.draft.title);
          setDescription(result.draft.description);
          setPlace(result.draft.locationName ?? "");
          setTimes(eventImageTimes(result.draft));
          setError("");
          setReview(result.warnings);
        }}
      />
      {review && <ExtractionReview warnings={review} />}
      {changed && (
        <Card>
          <Text style={u.title}>최신 저장본 확인</Text>
          {latest ? (
            <>
              <Text style={u.title}>{latest.title}</Text>
              <EventDetails event={latest} />
              <Text style={u.body}>
                내 입력을 유지하면 다음 저장 시 최신 내용을 덮어써요.
              </Text>
              <Action
                secondary
                label="내 입력 유지하고 최신 버전 확인"
                disabled={busy || blocked}
                onPress={() => setBaseline(latest)}
              />
              <Action
                secondary
                label="최신 저장본으로 입력 바꾸기"
                disabled={busy || blocked}
                onPress={() => {
                  setBaseline(latest);
                  setReview(null);
                  setPreviewReset((value) => value + 1);
                  setTitle(latest.title);
                  setDescription(latest.description);
                  setPlace(latest.locationName);
                  setTimes(initialTimes(latest.startsAt, latest.endsAt));
                }}
              />
            </>
          ) : (
            <Text style={u.body}>
              이 일정이 삭제되어 저장할 수 없어요. 입력 내용을 확인한 뒤
              목록으로 돌아가 주세요.
            </Text>
          )}
        </Card>
      )}
      <Field
        label="일정 이름"
        value={title}
        onChange={setTitle}
        editable={!busy}
        placeholder="예: 병원 방문"
      />
      <TimeEditor value={times} onChange={setTimes} disabled={busy} />
      <Field
        label="장소 (선택)"
        value={place}
        onChange={setPlace}
        editable={!busy}
      />
      <Field
        label="메모 (선택)"
        value={description}
        onChange={setDescription}
        multiline
        editable={!busy}
      />
      {!review && baseline?.latitude != null && (
        <Text style={u.body}>
          이 일정에 저장된 지도 좌표는 그대로 유지돼요.
        </Text>
      )}
      {!!error && <Text style={u.error}>{error}</Text>}
      <Action
        label="개인 일정 저장"
        disabled={busy || blocked || changed}
        onPress={() => {
          try {
            const body = privateEventBody(
              { title, description, locationName: place, ...timeRange(times) },
              review ? eventImageSaveSource(baseline) : baseline,
            );
            setError("");
            onSave(baseline, body);
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      />
      <Action
        secondary
        label="편집 취소 · 목록으로"
        disabled={busy}
        onPress={() =>
          Alert.alert("편집을 취소할까요?", "저장하지 않은 입력은 사라져요.", [
            { text: "계속 편집", style: "cancel" },
            { text: "목록으로", onPress: onCancel },
          ])
        }
      />
    </View>
  );
}
