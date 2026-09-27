import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { Timetable } from "./account-forms";
import { request } from "./api";
import { canApplyTimetable } from "./class-quests";
import { createRefreshQueue } from "./refresh-queue";
export type TimetableSource = {
  value: Timetable | null;
  loading: boolean;
  error: string;
};
type Snapshot = TimetableSource & { token: string };
export function useTimetable(
  token: string,
  session: RefObject<{ token: string }>,
) {
  const [snapshot, setSnapshot] = useState<Snapshot>({
    token: "",
    value: null,
    loading: false,
    error: "",
  });
  const current = useRef(snapshot),
    epoch = useRef(0),
    queue = useRef<{
      token: string;
      value: ReturnType<typeof createRefreshQueue>;
    } | null>(null);
  const publish = useCallback((next: Snapshot) => {
    current.current = next;
    setSnapshot(next);
  }, []);
  useEffect(() => {
    const sourceEpoch = ++epoch.current;
    publish({ token, value: null, loading: !!token, error: "" });
    if (!token) return;
    let active = true;
    const refreshQueue = createRefreshQueue(
      async () => {
        if (!active || session.current.token !== token) return;
        const requestEpoch = epoch.current;
        publish({ ...current.current, loading: true });
        try {
          const value = await request<Timetable>("/me/timetable", token);
          if (!active) return;
          if (
            canApplyTimetable(
              token,
              session.current.token,
              requestEpoch,
              epoch.current,
              value.version,
              current.current.value?.version ?? 0,
            )
          ) {
            publish({ token, value, loading: false, error: "" });
          } else if (
            session.current.token === token &&
            requestEpoch === epoch.current
          ) {
            publish({ ...current.current, loading: false });
          }
        } catch (error) {
          if (
            active &&
            token === session.current.token &&
            requestEpoch === epoch.current
          )
            publish({
              ...current.current,
              loading: false,
              error:
                error instanceof Error
                  ? error.message
                  : "시간표를 불러오지 못했어요.",
            });
        }
      },
      () => undefined,
    );
    queue.current = { token, value: refreshQueue };
    refreshQueue.request();
    return () => {
      active = false;
      if (epoch.current === sourceEpoch) epoch.current++;
      refreshQueue.dispose();
      if (queue.current?.value === refreshQueue) queue.current = null;
    };
  }, [token, session, publish]);
  const refresh = useCallback(() => {
    if (
      token &&
      token === session.current.token &&
      queue.current?.token === token
    )
      queue.current.value.request();
  }, [token, session]);
  const applySaved = useCallback(
    (value: Timetable) => {
      if (
        !canApplyTimetable(
          token,
          session.current.token,
          epoch.current,
          epoch.current,
          value.version,
          current.current.token === token
            ? (current.current.value?.version ?? 0)
            : 0,
        )
      )
        return;
      epoch.current++;
      publish({ token, value, loading: false, error: "" });
    },
    [token, session, publish],
  );
  const clear = useCallback(() => {
    epoch.current++;
    publish({ token: "", value: null, loading: false, error: "" });
  }, [publish]);
  const source: TimetableSource =
    snapshot.token === token
      ? snapshot
      : { value: null, loading: !!token, error: "" };
  return { source, refresh, applySaved, clear };
}
