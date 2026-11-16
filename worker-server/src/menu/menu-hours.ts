/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { MEALS, type MealHours, type MenuLine } from './dto/menus-collected.dto.js';

// The forms the pages write: "※ 운영시간 : 11:00~14:30", "※운영시간: 11:30~13:30", "※ 운영시간 11:30~13:30",
// "※ 운영시간 : 11:30 ~ 14:00", "※ 운영 시간 9 : 30 ~ 19 : 00". Anything else on the line, such as "학기중 평일, 주말"
// or a last order, leaves it unread.
const HOURS_LINE = /^※\s*운영\s?시간\s*:?\s*(\d{1,2})\s*:\s*(\d{2})\s*~\s*(\d{1,2})\s*:\s*(\d{2})$/u;

function timeOfDay(hour: string, minute: string): string | null {
  return Number(hour) < 24 && Number(minute) < 60 ? `${hour.padStart(2, '0')}:${minute}` : null;
}

// The opening and closing time an hours line gives, as "HH:MM" in Asia/Seoul, when the line reads for sure.
export function readHoursLine(text: string): Pick<MealHours, 'opensAt' | 'closesAt'> | null {
  const match = HOURS_LINE.exec(text);
  if (match === null) {
    return null;
  }
  const [, openHour = '', openMinute = '', closeHour = '', closeMinute = ''] = match;
  const opensAt = timeOfDay(openHour, openMinute);
  const closesAt = timeOfDay(closeHour, closeMinute);
  // "HH:MM" texts order as the times do.
  return opensAt !== null && closesAt !== null && opensAt < closesAt ? { opensAt, closesAt } : null;
}

// Each meal's hours, from the one hours line of its cell. A cell with several, such as one for each corner, gives none:
// which of them is the Restaurant's is not sure.
export function readMealHours(lines: readonly MenuLine[]): MealHours[] {
  return MEALS.flatMap((meal) => {
    const read = lines.flatMap(({ meal: lineMeal, text }) => {
      const hours = lineMeal === meal ? readHoursLine(text) : null;
      return hours === null ? [] : [{ meal, ...hours, line: text }];
    });
    return read.length === 1 ? read : [];
  });
}
