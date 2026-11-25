/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { defineTool, noneFound, type Tool } from '../feature.js';
import { othersText } from '../others-text.js';
import { type MenuLookupService } from '../lookup/menu.service.js';
import { resolved } from '../tools/resolved.js';
import { type MealPlanService } from './meal-plan.service.js';
import { cellReasonOf, missingLookup, missingWords, planReasonOf } from './missing-place.js';

const input = z.object({
  restaurant: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .describe("The User's words for the Restaurant they ask about, as they wrote them (302동, 두레미담)."),
});

// Why a Restaurant is not among the places of the meal answer on screen (P04 ticket 67): the meal on screen planned
// again for the same conditions, and the Restaurant brought to the map with its reason, as a menu's answer brings it.
export function whyNotListed(
  plans: Pick<MealPlanService, 'planned'>,
  menus: Pick<MenuLookupService, 'named' | 'mealsOf' | 'placeOf'>,
): Tool {
  return defineTool({
    description:
      "Says why a Restaurant is not among the places of the meal answer on screen ([Plan on screen: …]), planning that meal again for the same conditions, and the app brings the Restaurant to the map with the reason. Answers result 'reason' with the Restaurant, why (closed: its menu's notice closes the meal; no-menu: its menu was not collected for the meal; time: there is too little time there; no-fit: it cannot be reached, eaten at, and left in time; listed: it is one of the places) and, for closed, notices, the menu's own lines, else words, the reason in the User's terms; result 'several' with the Restaurants the words could name; or result 'none'.",
    input,
    run: async ({ restaurant }, { userId, now, context, presented, capabilities }) => {
      const conditions = context.conditions;
      if (conditions?.kind !== 'meal') {
        return noneFound('No meal answer is on screen: answer from what the User asked, without this tool.');
      }
      const chosen = resolved(
        menus.named(restaurant).map((name) => ({ name })),
        `No Restaurant on the map has a name holding ${restaurant}.`,
      );
      if (chosen.result !== 'one') {
        return chosen;
      }
      const key = chosen.candidate.name;
      const { location, locationMissing } = context;
      const at = { now, location, locationMissing, setsAside: capabilities.has('plan-set') };
      const cell =
        (await menus.mealsOf(key, conditions.date)).find(({ meal }) => meal === conditions.meal)?.lines ?? [];
      const reason = cellReasonOf(cell) ?? planReasonOf(key, (await plans.planned(userId, conditions, at)).answer);
      const place = menus.placeOf(key);
      if (place !== null) {
        presented.lookup = missingLookup(key, reason, place);
        presented.answer = null;
        presented.mapButtons.length = 0;
      }
      const said =
        reason.why === 'closed'
          ? { notices: reason.notices.map((text) => othersText('menu.line', text)) }
          : { words: missingWords(reason) };
      return { result: 'reason', restaurant: key, why: reason.why, ...said };
    },
  });
}

// The rule of a Restaurant missing from the meal on screen, a fragment of the chat's system prompt for an app that draws
// answers.
export const MISSING_RULES = `- When the User asks why a Restaurant is not among the places of the meal on screen (왜 302동은 없어?, 두레미담은 왜 안 떠?), call whyNotListed with their words for it, and answer in one sentence with the Restaurant and its words, or for closed with what its notices say, such as "302동식당은 공대수시면접으로 인해 휴점해요." or "두레미담은 13분밖에 못 있어요.". Never guess a reason, and never call planMeal for it: the plans on screen stay. With listed, say it is one of the places.
- A Restaurant closed for the meal by its menu's notice is no plan, and the app lists it apart: never mention it unless the User asks about it.`;
