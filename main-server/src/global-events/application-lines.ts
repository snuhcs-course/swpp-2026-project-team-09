/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-05  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

// What marks a line as a period to apply in, not the event's own time.
export const APPLICATION =
  /신청|접수|모집|등록|지원\s*기간|마감|응모|제출|원서|예약|appl(?:y|ication)|regist(?:er|ration)|deadline/iu;

// A line this short holds a label for the next one, as "신청 기간" above its dates does.
const LABEL_LENGTH = 20;

// Whether the line at `index` of a post's lines writes an application period, by itself or under a short label.
export function isApplicationAt(lines: string[], index: number): boolean {
  const above = lines[index - 1];
  const labelAbove = above !== undefined && above.length <= LABEL_LENGTH ? above : '';
  return APPLICATION.test(lines[index] ?? '') || APPLICATION.test(labelAbove);
}
