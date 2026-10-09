// AI-generated with Claude Opus 5.5, 2026-10-04, prompted by TaeHyun79, reviewed by fyoon46 in #31
import { load } from 'cheerio';
import { type RouteStop } from './dto/shuttle-stops-collected.dto.js';

// Reads the stops of the operator's route page in loop order, with their places on the drawing, and the service hours.
export function parseRoutePage(html: string): { stops: RouteStop[]; serviceHours: string } {
  const $ = load(html);
  // A blocked request is answered with status 200 and another page, so the content is checked.
  const points = $('#routef .route_point').toArray();
  if (points.length === 0) {
    throw new Error('The page has no stops of the route');
  }
  const stops = points.map((point, index) => {
    const name = $(point).find('em').text().trim();
    // "position: absolute; top: 35px; left:157px;"
    const style = $(point).attr('style') ?? '';
    const left = /left:\s*(\d+)px/u.exec(style)?.[1];
    const top = /top:\s*(\d+)px/u.exec(style)?.[1];
    if (name === '' || left === undefined || top === undefined) {
      throw new Error(`The page has a stop without its name or place on the drawing: ${index + 1}`);
    }
    return { name, left: Number(left), top: Number(top) };
  });
  $('br').replaceWith('\n');
  // Written with no-break spaces only.
  const serviceHours = $('#header .bottom_box li')
    .text()
    .split('\n')
    .map((line) => line.replaceAll('\u00A0', ' ').trim())
    .filter((line) => line !== '')
    .join('\n');
  if (serviceHours === '') {
    throw new Error('The page has no service hours');
  }
  return { stops, serviceHours };
}
