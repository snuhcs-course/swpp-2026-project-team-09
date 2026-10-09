/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { MenuLine, RestaurantMenus } from '@/api/menu-types';
import { field, hasTexts, isNumber, isText, isTextOrNull, listOf } from './answers';

// The checks of the main server's menus.

function isMenuLine(value: unknown): value is MenuLine {
  const kind = field(value, 'kind');
  const price = field(value, 'price');
  return (
    isText(field(value, 'text')) &&
    (kind === null || kind === 'heading' || kind === 'dish' || kind === 'note') &&
    isTextOrNull(field(value, 'name')) &&
    (price === null || isNumber(price))
  );
}

function isMeal(value: unknown): value is RestaurantMenus['meals'][number] {
  const meal = field(value, 'meal');
  return (meal === 'breakfast' || meal === 'lunch' || meal === 'dinner') && listOf(isMenuLine)(field(value, 'lines'));
}

function isRestaurantMenus(value: unknown): value is RestaurantMenus {
  return hasTexts(value, ['name', 'collectedAt']) && listOf(isMeal)(field(value, 'meals'));
}

export const isMenus = listOf(isRestaurantMenus);
