export const MEALS = ['breakfast', 'lunch', 'dinner'] as const;

export type Meal = (typeof MEALS)[number];

export type MenuLineKind = 'heading' | 'dish' | 'note';

// One line of a meal's cell. `kind` and `price` are set only when the parser is sure
// (docs/adr/0001-menus-kept-as-lines.md).
export interface MenuLine {
  meal: Meal;
  text: string;
  kind: MenuLineKind | null;
  price: number | null;
}

export interface RestaurantMenu {
  name: string;
  lines: MenuLine[];
}

// Every restaurant a page lists for one day. `date` is a calendar day in Asia/Seoul, as YYYY-MM-DD.
export interface MenuDay {
  date: string;
  restaurants: RestaurantMenu[];
}

export type MenuSource = 'coop_menus' | 'dormitory_menus' | 'veterinary_menus';

// What one Collection of a menu Source read, sent to the main server as `menus-collected`.
export interface MenusCollectedMessage {
  source: MenuSource;
  collectedAt: string;
  days: MenuDay[];
}
