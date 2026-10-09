/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-01  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { load } from 'cheerio';
import { MEALS, type RestaurantMenu } from './dto/menus-collected.dto.js';
import { readMenuLines } from './menu-line.js';

// Reads the restaurants of the Co-op's menu page of `date`. The dormitory's page is built the same way.
export function parseMenuPage(html: string, date: string): RestaurantMenu[] {
  const $ = load(html);
  // A blocked request is answered with status 200 and another page, so the content is checked.
  if ($('table.menu-table').length === 0) {
    throw new Error('The page has no menu table');
  }
  if ($('input[name="date"]').val() !== date) {
    throw new Error(`The page is not the menu of ${date}`);
  }
  $('br').replaceWith('\n');
  return $('table.menu-table tbody tr')
    .toArray()
    .map((row) => ({
      // The Co-op page appends a telephone number: "학생회관식당 (880-5543)".
      name: $(row)
        .find('td.title')
        .text()
        .trim()
        .replace(/\s*\(\d+-\d+\)$/u, ''),
      lines: MEALS.flatMap((meal) => readMenuLines(meal, $(row).find(`td.${meal}`).text())),
    }));
}
