/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type PlaceDto } from '../../places/dto/place.dto.js';
import { type MealInput } from '../dto/answer.dto.js';
import { type ToolContext } from '../feature.js';
import { type FreeTimeServices } from '../free-time/free-time-services.js';
import { leftOutNow } from '../free-time/left-out-classes.js';
import { KWANJEONG_PLACE_NUMBER } from '../library/catalogue.js';
import { type PlanAnswersService } from '../plan-answers.service.js';
import { mealAfterSteps, presentAllSteps } from '../steps/all-steps.js';
import { afterStepsShown, bookingSteps, pointOf, presentSteps } from '../steps/plan-steps.js';

// The chat's steps of a message that asked for several things (P03). An app that says `answers` gets them over every
// answer, each step that can move set out from the one before it (P05 ticket 74); any other, a meal after a booking, as
// before.

interface StepsServices {
  freeTime: FreeTimeServices;
  plans: PlanAnswersService;
}

const kwanjeongOf =
  ({ places }: FreeTimeServices) =>
  (): PlaceDto | null =>
    places.numbered(KWANJEONG_PLACE_NUMBER);

// The meal's conditions set out from the step before it among those shown so far, as planMeal plans it.
export function mealStartAfter(
  freeTime: FreeTimeServices,
): (input: MealInput, context: ToolContext) => Promise<MealInput> {
  const kwanjeong = kwanjeongOf(freeTime);
  return (input, context) => {
    if (context.capabilities.has('answers')) {
      return mealAfterSteps(input, context, kwanjeong, freeTime.days);
    }
    const place = kwanjeong();
    return Promise.resolve(
      afterStepsShown(input, bookingSteps(context.presented, place === null ? null : pointOf(place))),
    );
  };
}

// What a run that answered does last: the steps of the message.
export function stepsAfterRun({ freeTime, plans }: StepsServices): (context: ToolContext) => Promise<void> {
  const kwanjeong = kwanjeongOf(freeTime);
  return (context) =>
    context.capabilities.has('answers')
      ? presentAllSteps(context, {
          kwanjeong,
          replan: (input, { userId, now, context: asked, presented, capabilities }) =>
            plans.plan(userId, input, {
              now,
              location: asked.location,
              locationMissing: asked.locationMissing,
              skipped: leftOutNow({ context: asked, presented }),
              setsAside: capabilities.has('plan-set'),
            }),
          itemsOn: (userId, date) => freeTime.days.itemsOn(userId, date),
        })
      : presentSteps(context, {
          kwanjeong,
          replanMeal: (input, { userId, now, context: { location, locationMissing } }) =>
            plans.meals.plan(userId, input, { now, location, locationMissing }),
        });
}
