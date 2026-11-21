/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type MenuLineDto } from './dto/restaurant-menus.dto.js';

const CORNER_TAG = /^<[^>]*>\s*/u;

// A dish as a meal Plan names it, and as its kind of food is kept: its name without its price or its corner's tag.
export function dishName({ name, text }: Pick<MenuLineDto, 'name' | 'text'>): string {
  return (name ?? text).replace(CORNER_TAG, '').trim();
}
