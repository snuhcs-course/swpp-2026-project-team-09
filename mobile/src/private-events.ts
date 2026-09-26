import type { PrivateEvent } from "./api";
export type PrivateEventDraft = {
  title: string;
  description: string;
  locationName: string;
  startsAt: string;
  endsAt: string;
};
export function privateEventBody(
  draft: PrivateEventDraft,
  original?: PrivateEvent | null,
) {
  const title = draft.title.trim(),
    description = draft.description.trim(),
    locationName = draft.locationName.trim();
  if (!title || title.length > 200)
    throw new Error("일정 이름을 1~200자로 입력해 주세요.");
  if (description.length > 5000)
    throw new Error("메모는 5000자까지 입력할 수 있어요.");
  if (locationName.length > 300)
    throw new Error("장소는 300자까지 입력할 수 있어요.");
  const start = Date.parse(draft.startsAt),
    end = Date.parse(draft.endsAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
    throw new Error("종료 시간은 시작 시간보다 늦어야 해요.");
  if (end - start > 31 * 24 * 60 * 60_000)
    throw new Error("일정 기간은 최대 31일까지 정할 수 있어요.");
  return {
    title,
    description,
    locationName,
    startsAt: draft.startsAt,
    endsAt: draft.endsAt,
    latitude: original?.latitude ?? null,
    longitude: original?.longitude ?? null,
    ...(original ? { expectedVersion: original.version } : {}),
  };
}
export function privateEventDeleteBody(event: Pick<PrivateEvent, "version">) {
  return { expectedVersion: event.version };
}
export function privateEventRevisionChanged(
  baseline: PrivateEvent | null,
  latest: PrivateEvent | undefined,
) {
  return !!baseline && (!latest || baseline.version !== latest.version);
}
