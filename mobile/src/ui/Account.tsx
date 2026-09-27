import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { ApiError, request } from "../api";
import {
  ClassEntry,
  Profile,
  Timetable,
  classId,
  clockText,
  minuteOfDay,
  profileBody,
  profileDraft,
  validateTimetable,
} from "../account-forms";
import { ImageImport, ExtractionReview } from "./ImageImport";
import { timetableImageDraft } from "../image-extraction";
import { Action, Card, Field, colors, u } from "./Primitives";

// A successful write is applied directly; a later refresh cannot make it look failed.
function useAccountRecord<T extends { version: number }>(
  token: string,
  path: string,
) {
  const [record, setRecord] = useState<T | null>(null);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [conflict, setConflict] = useState(false);
  const active = useRef(false),
    lock = useRef(false);
  useEffect(() => {
    active.current = true;
    void load();
    return () => {
      active.current = false;
    };
  }, []);
  async function load() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    try {
      const next = await request<T>(path, token);
      if (active.current) {
        setRecord(next);
        setConflict(false);
        setMessage(
          record
            ? "최신 저장 내용을 불러왔어요. 아래 저장본과 내 입력을 비교해 주세요."
            : "",
        );
      }
    } catch (e) {
      if (active.current)
        setMessage(
          e instanceof Error
            ? e.message
            : "불러오지 못했어요. 다시 시도해 주세요.",
        );
    } finally {
      lock.current = false;
      if (active.current) setBusy(false);
    }
  }
  async function save(
    method: string,
    body: unknown,
    onSaved?: (value: T) => void,
  ) {
    if (lock.current || conflict) return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    try {
      const next = await request<T>(path, token, method, body);
      onSaved?.(next);
      if (active.current) {
        setRecord(next);
        setMessage("저장했어요.");
        return next;
      }
    } catch (e) {
      if (active.current) {
        const stale = e instanceof ApiError && e.status === 409;
        setConflict(stale);
        setMessage(
          stale
            ? "다른 곳에서 변경된 내용이 있어요. 입력한 내용은 그대로 두고 최신 저장본을 확인해 주세요."
            : e instanceof Error
              ? e.message
              : "저장하지 못했어요.",
        );
      }
    } finally {
      lock.current = false;
      if (active.current) setBusy(false);
    }
  }
  return { record, busy, message, conflict, load, save };
}
const weekdays = ["월", "화", "수", "목", "금", "토", "일"];
export function AccountEditor({
  token,
  kind,
  onProfileSaved,
  onTimetableSaved,
}: {
  token: string;
  kind: "profile" | "timetable";
  onProfileSaved: (profile: Profile) => void;
  onTimetableSaved: (timetable: Timetable) => void;
}) {
  return kind === "profile" ? (
    <ProfileEditor token={token} onSaved={onProfileSaved} />
  ) : (
    <TimetableEditor token={token} onSaved={onTimetableSaved} />
  );
}
function Feedback({
  state,
}: {
  state: {
    busy: boolean;
    message: string;
    conflict: boolean;
    record: unknown;
    load: () => Promise<void>;
  };
}) {
  return (
    <>
      {state.busy && (
        <ActivityIndicator
          color={colors.teal}
          accessibilityLabel="불러오거나 저장하는 중"
        />
      )}
      {!!state.message && (
        <Text style={u.error} accessibilityLiveRegion="polite">
          {state.message}
        </Text>
      )}
      {(state.conflict || (!state.record && !state.busy)) && (
        <Action
          secondary
          label={
            state.conflict ? "최신 저장본 확인 · 내 입력 유지" : "다시 불러오기"
          }
          disabled={state.busy}
          onPress={() => void state.load()}
        />
      )}
    </>
  );
}
function ProfileEditor({
  token,
  onSaved,
}: {
  token: string;
  onSaved: (profile: Profile) => void;
}) {
  const state = useAccountRecord<Profile>(token, "/me/profile");
  return (
    <>
      <Text style={u.body}>
        이름은 친구와 파티 참여자에게 표시돼요. 다른 프로필 항목은 현재 내
        계정에서만 확인할 수 있어요.
      </Text>
      <Feedback state={state} />
      {state.record && (
        <ProfileFields
          record={state.record}
          disabled={state.busy || state.conflict}
          save={(body) => state.save("PATCH", body, onSaved)}
        />
      )}
    </>
  );
}
function ProfileFields({
  record,
  disabled,
  save,
}: {
  record: Profile;
  disabled: boolean;
  save: (body: unknown) => Promise<Profile | undefined>;
}) {
  const [draft, setDraft] = useState(() => profileDraft(record)),
    [error, setError] = useState("");
  const [baseVersion, setBaseVersion] = useState(record.version);
  const changed = baseVersion !== record.version;
  const fields = [
    ["displayName", "이름"],
    ["department", "학과 (선택)"],
    ["admissionYear", "입학 연도 (선택)"],
    ["interests", "관심사 (쉼표로 구분, 선택)"],
    ["statusMessage", "상태 메시지 (선택)"],
  ] as const;
  async function submit() {
    try {
      const body = profileBody(draft);
      setError("");
      const saved = await save({ ...body, expectedVersion: record.version });
      if (saved) {
        setDraft(profileDraft(saved));
        setBaseVersion(saved.version);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <View style={{ gap: 16 }}>
      {changed && (
        <Card>
          <Text style={u.body}>
            최신 저장본: {record.displayName} ·{" "}
            {record.department || "학과 없음"} ·{" "}
            {record.admissionYear || "입학 연도 없음"}
            {"\n"}
            {record.interests.join(", ") || "관심사 없음"}
            {"\n"}
            {record.statusMessage || "상태 메시지 없음"}
          </Text>
          <Text style={u.body}>
            내 입력으로 다시 저장하려면 아래 내용을 확인해 주세요.
          </Text>
          <Action
            secondary
            label="내 입력 유지하고 확인 완료"
            disabled={disabled}
            onPress={() => setBaseVersion(record.version)}
          />
          <Action
            secondary
            label="최신 저장본으로 입력 바꾸기"
            disabled={disabled}
            onPress={() => {
              setDraft(profileDraft(record));
              setBaseVersion(record.version);
            }}
          />
        </Card>
      )}
      <View pointerEvents={disabled ? "none" : "auto"} style={{ gap: 16 }}>
        {fields.map(([key, label]) => (
          <Field
            key={key}
            editable={!disabled}
            label={label}
            value={draft[key]}
            numeric={key === "admissionYear"}
            multiline={key === "statusMessage"}
            onChange={(value) => setDraft((d) => ({ ...d, [key]: value }))}
          />
        ))}
      </View>
      {!!error && <Text style={u.error}>{error}</Text>}
      <Action
        label="프로필 저장"
        disabled={disabled || changed}
        onPress={() => void submit()}
      />
    </View>
  );
}
function TimetableEditor({
  token,
  onSaved,
}: {
  token: string;
  onSaved: (timetable: Timetable) => void;
}) {
  const state = useAccountRecord<Timetable>(token, "/me/timetable");
  return (
    <>
      <Text style={u.body}>
        내 계정에 저장되는 비공개 시간표예요. 한국 시간(Asia/Seoul) 기준으로
        매주 반복되는 수업을 직접 입력해 주세요.
      </Text>
      <Feedback state={state} />
      {state.record && (
        <TimetableFields
          token={token}
          record={state.record}
          disabled={state.busy || state.conflict}
          save={(body) => state.save("PUT", body, onSaved)}
        />
      )}
    </>
  );
}
function TimetableFields({
  token,
  record,
  disabled: formDisabled,
  save,
}: {
  token: string;
  record: Timetable;
  disabled: boolean;
  save: (body: unknown) => Promise<Timetable | undefined>;
}) {
  const [draft, setDraft] = useState(record),
    [baseVersion, setBaseVersion] = useState(record.version),
    [error, setError] = useState("");
  const [editing, setEditing] = useState<ClassEntry | null>(null);
  const [importing, setImporting] = useState(false),
    [review, setReview] = useState<string[] | null>(null),
    [previewReset, setPreviewReset] = useState(0);
  const disabled = formDisabled || importing;
  const changed = baseVersion !== record.version;
  async function submit() {
    try {
      validateTimetable(draft);
      setError("");
      const saved = await save({
        expectedVersion: record.version,
        timezone: "Asia/Seoul",
        semesterStartsOn: draft.semesterStartsOn,
        semesterEndsOn: draft.semesterEndsOn,
        entries: draft.entries,
      });
      if (saved) {
        setDraft(saved);
        setBaseVersion(saved.version);
        setReview(null);
        setPreviewReset((value) => value + 1);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <View style={{ gap: 16 }}>
      <ImageImport
        token={token}
        kind="timetable"
        disabled={formDisabled || !!editing || changed}
        resetGeneration={previewReset}
        onBusyChange={setImporting}
        onExtracted={(result) => {
          if (result.kind !== "timetable") return;
          setDraft(timetableImageDraft(record, result.draft, classId));
          setEditing(null);
          setError("");
          setReview(result.warnings);
        }}
      />
      {review && <ExtractionReview warnings={review} timetable />}
      {changed && (
        <Card>
          <Text style={u.title}>최신 저장본</Text>
          <Text style={u.body}>
            {record.semesterStartsOn} ~ {record.semesterEndsOn} ·{" "}
            {record.entries.length}개 수업
          </Text>
          {record.entries.map((e) => (
            <Text key={e.id} style={u.body}>
              {e.title} · {weekdays[e.weekday - 1]} {clockText(e.startMinute)}–
              {clockText(e.endMinute)} · {e.locationName || "장소 없음"}
            </Text>
          ))}
          <Text style={u.body}>
            내 입력을 유지하면 다음 저장 시 위 내용을 덮어써요.
          </Text>
          <Action
            secondary
            label="내 입력 유지하고 확인 완료"
            disabled={disabled}
            onPress={() => setBaseVersion(record.version)}
          />
          <Action
            secondary
            label="최신 저장본으로 입력 바꾸기"
            disabled={disabled}
            onPress={() => {
              setDraft(record);
              setReview(null);
              setPreviewReset((value) => value + 1);
              setEditing(null);
              setBaseVersion(record.version);
            }}
          />
        </Card>
      )}
      <View pointerEvents={disabled ? "none" : "auto"} style={{ gap: 16 }}>
        <Field
          editable={!disabled}
          label="학기 시작일"
          value={draft.semesterStartsOn ?? ""}
          placeholder="2026-09-01"
          onChange={(value) =>
            setDraft((d) => ({ ...d, semesterStartsOn: value }))
          }
        />
        <Field
          editable={!disabled}
          label="학기 종료일"
          value={draft.semesterEndsOn ?? ""}
          placeholder="2026-12-21"
          onChange={(value) =>
            setDraft((d) => ({ ...d, semesterEndsOn: value }))
          }
        />
        <Text style={u.body}>
          날짜는 YYYY-MM-DD 형식으로 입력해 주세요. 수업 추가·수정·삭제 후
          시간표 저장을 눌러야 반영돼요.
        </Text>
        {!draft.entries.length && (
          <Text style={u.body}>
            아직 등록한 수업이 없어요. 학기 기간을 정하고 첫 수업을 추가해
            보세요.
          </Text>
        )}
        {[...draft.entries]
          .sort(
            (a, b) => a.weekday - b.weekday || a.startMinute - b.startMinute,
          )
          .map((e) => (
            <Card key={e.id}>
              <Text style={u.title}>{e.title}</Text>
              <Text style={u.body}>
                {weekdays[e.weekday - 1]}요일 {clockText(e.startMinute)}–
                {clockText(e.endMinute)} · {e.locationName || "장소 미입력"}
              </Text>
              <View style={u.row}>
                <Action
                  small
                  secondary
                  label="수정"
                  disabled={!!editing || disabled}
                  onPress={() => setEditing(e)}
                />
                <Action
                  small
                  secondary
                  label="삭제"
                  disabled={!!editing || disabled}
                  onPress={() =>
                    setDraft((d) => ({
                      ...d,
                      entries: d.entries.filter((item) => item.id !== e.id),
                    }))
                  }
                />
              </View>
            </Card>
          ))}
        {!editing && (
          <Action
            secondary
            label="수업 추가"
            disabled={disabled || draft.entries.length >= 100}
            onPress={() =>
              setEditing({
                id: classId(),
                title: "",
                weekday: 1,
                startMinute: 540,
                endMinute: 600,
                locationName: null,
              })
            }
          />
        )}
        {editing && (
          <ClassFields
            key={editing.id}
            entry={editing}
            onCancel={() => setEditing(null)}
            onApply={(entry) => {
              const next = {
                ...draft,
                entries: [
                  ...draft.entries.filter((e) => e.id !== entry.id),
                  entry,
                ],
              };
              validateTimetable(next);
              setDraft(next);
              setEditing(null);
            }}
          />
        )}
      </View>
      {!!error && <Text style={u.error}>{error}</Text>}
      <Action
        label="시간표 저장"
        disabled={disabled || changed || !!editing}
        onPress={() => void submit()}
      />
    </View>
  );
}
function ClassFields({
  entry,
  onApply,
  onCancel,
}: {
  entry: ClassEntry;
  onApply: (entry: ClassEntry) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(entry.title),
    [location, setLocation] = useState(entry.locationName ?? ""),
    [weekday, setWeekday] = useState(entry.weekday),
    [start, setStart] = useState(clockText(entry.startMinute)),
    [end, setEnd] = useState(clockText(entry.endMinute)),
    [error, setError] = useState("");
  return (
    <Card>
      <Text style={u.title}>수업 입력</Text>
      <Field label="수업명" value={title} onChange={setTitle} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {weekdays.map((day, i) => (
          <Action
            key={day}
            small
            secondary={weekday !== i + 1}
            label={`${day}${weekday === i + 1 ? " ✓" : ""}`}
            onPress={() => setWeekday(i + 1)}
          />
        ))}
      </View>
      <Field label="시작 시간 (HH:mm)" value={start} onChange={setStart} />
      <Field label="종료 시간 (HH:mm)" value={end} onChange={setEnd} />
      <Field label="장소 (선택)" value={location} onChange={setLocation} />
      {!!error && <Text style={u.error}>{error}</Text>}
      <Action
        label="수업 목록에 반영"
        onPress={() => {
          try {
            onApply({
              ...entry,
              title: title.trim(),
              weekday,
              startMinute: minuteOfDay(start.trim()),
              endMinute: minuteOfDay(end.trim(), true),
              locationName: location.trim() || null,
            });
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      />
      <Action secondary label="수업 편집 취소" onPress={onCancel} />
    </Card>
  );
}
