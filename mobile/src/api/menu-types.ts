// --- Menus (GET /menus?date=) ---

export type Meal = 'breakfast' | 'lunch' | 'dinner';

// One line of a meal's cell, as the page wrote it (ADR 0001). The rest is set only where the worker was sure.
export interface MenuLine {
  text: string;
  kind: 'heading' | 'dish' | 'note' | null;
  // A dish's text without its price, when the line ends with that price.
  name: string | null;
  // In won.
  price: number | null;
}

// One restaurant's menus of a day. `meals` holds the meals that have lines, breakfast, lunch, dinner; a restaurant
// the page lists with empty cells has none.
export interface RestaurantMenus {
  name: string;
  collectedAt: string;
  meals: { meal: Meal; lines: MenuLine[] }[];
}
