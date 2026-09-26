const two = (value: number) => String(value).padStart(2, "0");
export function localFields(value: Date | string) {
  const date = new Date(value);
  return {
    date: `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`,
    time: `${two(date.getHours())}:${two(date.getMinutes())}`,
  };
}
export type TimeFields = {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
};
export function initialTimes(startsAt?: string, endsAt?: string): TimeFields {
  const next = new Date(
    Math.ceil((Date.now() + 30 * 60_000) / (30 * 60_000)) * 30 * 60_000,
  );
  const start = localFields(startsAt || next.toISOString());
  const end = localFields(
    endsAt || new Date(next.getTime() + 60 * 60_000).toISOString(),
  );
  return {
    startDate: start.date,
    startTime: start.time,
    endDate: end.date,
    endTime: end.time,
  };
}
export function dateAfterDays(days: number, now = new Date()) {
  const date = new Date(now);
  date.setDate(date.getDate() + days);
  return localFields(date).date;
}
function parseLocal(date: string, time: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time))
    throw new Error("날짜는 YYYY-MM-DD, 시간은 HH:mm으로 입력해 주세요.");
  const [year, month, day] = date.split("-").map(Number),
    [hour, minute] = time.split(":").map(Number);
  const value = new Date(year, month - 1, day, hour, minute);
  if (
    year < 2000 ||
    value.getFullYear() !== year ||
    value.getMonth() !== month - 1 ||
    value.getDate() !== day ||
    value.getHours() !== hour ||
    value.getMinutes() !== minute
  )
    throw new Error("존재하는 날짜와 시간을 입력해 주세요.");
  return value;
}
export function timeRange(fields: TimeFields) {
  const start = parseLocal(fields.startDate.trim(), fields.startTime.trim()),
    end = parseLocal(fields.endDate.trim(), fields.endTime.trim());
  if (end <= start) throw new Error("종료 시간은 시작 시간보다 늦어야 합니다.");
  return { startsAt: start.toISOString(), endsAt: end.toISOString() };
}
export function partySize(value: string, max = 20) {
  const size = Number(value);
  if (!Number.isInteger(size) || size < 2 || size > max)
    throw new Error(`인원은 2명부터 ${max}명까지 입력해 주세요.`);
  return size;
}
export function matchBody(input: {
  activity: string;
  size: string;
  interests: string;
  consent: boolean;
  times: TimeFields;
  eventId?: string;
}) {
  if (!input.activity.trim()) throw new Error("함께할 활동을 입력해 주세요.");
  if (!input.consent)
    throw new Error("조건에 맞는 파티의 자동 가입에 동의해 주세요.");
  const range = timeRange(input.times);
  return {
    activity: input.activity.trim(),
    partySize: partySize(input.size, 6),
    timeStart: range.startsAt,
    timeEnd: range.endsAt,
    interests: input.interests
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    autoJoinConsent: true as const,
    ...(input.eventId ? { eventId: input.eventId } : {}),
  };
}

export function meetupBody(
  input: {
    friendId: string;
    title: string;
    locationName: string;
    times: TimeFields;
  },
  now = Date.now(),
) {
  if (!input.friendId) throw new Error("약속을 제안할 친구를 선택해 주세요.");
  const title = input.title.trim(),
    locationName = input.locationName.trim();
  if (!title || title.length > 200)
    throw new Error("약속 이름을 1~200자로 입력해 주세요.");
  if (!locationName || locationName.length > 300)
    throw new Error("만날 장소를 1~300자로 입력해 주세요.");
  const range = timeRange(input.times);
  if (Date.parse(range.startsAt) <= now)
    throw new Error("시작 시간은 현재보다 늦어야 해요.");
  if (
    Date.parse(range.endsAt) - Date.parse(range.startsAt) >
    31 * 24 * 60 * 60_000
  )
    throw new Error("약속 기간은 최대 31일까지 정할 수 있어요.");
  return { friendId: input.friendId, title, locationName, ...range };
}
