/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-01  Opus 5.5   prompted by TaeHyun79
 * 2026-10-02  Opus 5.5   prompted by fyoon46
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

export const MEALS = ['breakfast', 'lunch', 'dinner'] as const;

export type Meal = (typeof MEALS)[number];

export type MenuLineKind = 'heading' | 'dish' | 'note';

// One line of a meal's cell. `kind`, `name` and `price` are set only when the parser is sure
// (docs/adr/0001-menus-kept-as-lines.md).
export interface MenuLine {
  meal: Meal;
  text: string;
  kind: MenuLineKind | null;
  // A dish's text without its price.
  name: string | null;
  price: number | null;
}

// A meal's hours, read from the one hours line of its cell ("※ 운영시간 : 11:00~14:30"): times of day in Asia/Seoul as
// "HH:MM", and the line they were read from. The line stays among the lines as a note.
export interface MealHours {
  meal: Meal;
  opensAt: string;
  closesAt: string;
  line: string;
}

export interface RestaurantMenu {
  name: string;
  lines: MenuLine[];
  hours: MealHours[];
}

// Every restaurant a page lists for one day. `date` is a calendar day in Asia/Seoul, as YYYY-MM-DD.
export interface MenuDay {
  date: string;
  restaurants: RestaurantMenu[];
}

export const MENU_SOURCES = ['coop_menus', 'dormitory_menus', 'veterinary_menus'] as const;

export type MenuSource = (typeof MENU_SOURCES)[number];

// What one Collection of a menu Source read, posted to the main server's `/menus/collected`.
export interface MenusCollectedMessage {
  source: MenuSource;
  collectedAt: string;
  days: MenuDay[];
}
