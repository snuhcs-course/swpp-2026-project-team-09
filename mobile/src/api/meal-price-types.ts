/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// A meal's price condition in its conditions (P05 ticket 53), which the main server keeps and orders the plans by. The
// app never sets it, only takes it away (P04 ticket 92).
export interface MealPrice {
  // The highest price per person in won: the places under it come first. Absent for none.
  maxPrice?: number;
  // The cheapest first, by the list's price. Absent for the usual order.
  cheapFirst?: true;
}
