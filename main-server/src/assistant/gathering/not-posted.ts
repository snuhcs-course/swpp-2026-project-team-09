/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { dayWordsFrom } from '../korea-time.js';

// A day whose menus the Restaurants have not posted yet: the worker reads each day from today to six days ahead, at
// 05:00 and 10:00, and a day not posted has no menu at all. It is not a day the Restaurants are closed.

// "11/30(월) 메뉴는 아직 올라오지 않았어요", then, for a later day, how far ahead the menus are.
export function notPostedLines(date: string, now: Date): string[] {
  const day = dayWordsFrom(date, now);
  return day === ''
    ? ['오늘 메뉴는 아직 올라오지 않았어요']
    : [`${day} 메뉴는 아직 올라오지 않았어요`, '메뉴는 엿새 뒤 날짜까지 볼 수 있어요'];
}

// What the model is told of such a day.
export const NOT_POSTED =
  'That day\'s menus are not posted yet: menus are posted up to six days ahead, read at 05:00 and 10:00. Say so in the User\'s words, such as "11/30(월) 메뉴는 아직 올라오지 않았어요.", and that they come later; never that no Restaurant is open or that it is closed.';
