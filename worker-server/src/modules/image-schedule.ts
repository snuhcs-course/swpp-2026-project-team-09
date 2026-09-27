/** Conservative transcription parser, not natural-language date inference.
 * Accept one explicit YYYY년 M월 D일 / YYYY.M.D. / YYYY-MM-DD date,
 * optional Korean weekday, and one clock or a same-day clock range in Korea.
 * Missing years, multiple dates/sessions and unsupported prose remain unknown.
 * A range's unmarked end inherits an explicit start 오전/오후 only when it
 * remains later on that same day; we never infer a day/period rollover.
 */
export function parseImageSchedule(value: string | null): {
  startsAt: string | null;
  endsAt: string | null;
} {
  const unknown = { startsAt: null, endsAt: null };
  if (!value) return unknown;
  let source = value.trim().replace(/^(?:일시|일정|날짜)\s*[:：]?\s*/, "");
  const date =
    /^(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/.exec(source) ||
    /^(\d{4})\s*([.-])\s*(\d{1,2})\s*\2\s*(\d{1,2})\s*\.?/.exec(source);
  if (!date) return unknown;
  const numeric = date.length === 5;
  const year = date[1],
    month = numeric ? date[3] : date[2],
    day = numeric ? date[4] : date[3];
  const ymd = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  const parsed = new Date(`${ymd}T00:00:00Z`);
  if (
    year === "0000" ||
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== ymd
  )
    return unknown;
  source = source
    .slice(date[0].length)
    .trim()
    .replace(/^\([월화수목금토일](?:요일)?\)\s*/, "")
    .replace(/^(?:시간)\s*[:：]?\s*/, "");
  const clock =
    "(?:(오전|오후)\\s*)?([0-9]{1,2})(?::([0-9]{2})|\\s*시(?:\\s*([0-9]{1,2})\\s*분)?)";
  const single = new RegExp(`^${clock}$`).exec(source);
  const range = new RegExp(
    `^${clock}\\s*(?:[~～〜–—-]|부터)\\s*${clock}\\s*(?:까지)?$`,
  ).exec(source);
  const missingEnd = new RegExp(
    `^${clock}\\s*[~～〜–—-]\\s*(?:미정|종료\\s*미정)?$`,
  ).exec(source);
  const match = range || single || missingEnd;
  if (!match) return unknown;
  const minute = (parts: (string | undefined)[], inherited?: string) => {
    const [period, h, colon, korean] = parts;
    let hour = Number(h);
    const min = Number(colon || korean || 0);
    const marker = period || inherited;
    if (min > 59 || hour > 23 || (marker && (hour < 1 || hour > 12)))
      return null;
    if (marker) hour = (hour % 12) + (marker === "오후" ? 12 : 0);
    return hour * 60 + min;
  };
  const start = minute(match.slice(1, 5));
  if (start === null) return unknown;
  const iso = (minutes: number) =>
    `${ymd}T${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}:00+09:00`;
  const end = range ? minute(match.slice(5, 9), match[1]) : null;
  return {
    startsAt: iso(start),
    endsAt: end !== null && end > start ? iso(end) : null,
  };
}
