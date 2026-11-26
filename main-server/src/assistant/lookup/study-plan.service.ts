/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { BadRequestException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { type Position } from '../../common/geometry.js';
import { PlaceLookup } from '../../places/place-lookup.js';
import { StudySpacesService } from '../../study-spaces/study-spaces.service.js';
import { type AnswerReply, type LocationMissing, type StudyInput } from '../dto/answer.dto.js';
import { MINUTE_MS } from '../gathering/gathering.js';
import { readyAt, studyPlanAnswer } from './study-plan.js';
import { WayService } from './way.service.js';

// What a study answer reads (P10 ticket 03): the User's day from when they are ready, where they set out from, and the
// 공부공간 layer as the User may use it with each space's hours. The chat's tool and the recalculation both call it.
@Injectable()
export class StudyPlanService {
  constructor(
    private readonly ways: WayService,
    private readonly studySpaces: StudySpacesService,
    private readonly places: PlaceLookup,
  ) {}

  // Where the User is counts only when they set out now; a `from` constraint names where they set out from.
  async plan(
    askerId: string,
    input: StudyInput,
    at: { now: Date; location: Position | null; locationMissing?: LocationMissing },
  ): Promise<AnswerReply> {
    const [asker, ...friends] = input.people;
    if (asker?.userId !== askerId) {
      throw new BadRequestException('The first person of a plan is the asker');
    }
    // A study plan with Friends, a 관정 group study room, comes with P10 ticket 07.
    if (friends.length > 0) {
      throw new UnprocessableEntityException('A study plan with Friends cannot be answered yet');
    }
    const [fromPlaceId = null] = asker.constraints.flatMap((one) => (one.kind === 'from' ? [one.placeId] : []));
    if (fromPlaceId !== null && this.places.byId(fromPlaceId) === null) {
      throw new BadRequestException('No such Place');
    }
    const ready = readyAt(input, at.now);
    const now = ready.getTime() - at.now.getTime() < MINUTE_MS;
    const [way, buildings] = await Promise.all([
      this.ways.argsFor(
        askerId,
        { fromPlaceId, toPlaceId: null, by: null },
        { now: ready, location: now ? at.location : null, locationMissing: now ? at.locationMissing : null },
      ),
      this.studySpaces.listFor(askerId),
    ]);
    return studyPlanAnswer({
      input,
      way,
      now: at.now,
      buildings,
      hoursOf: (key, when) => this.studySpaces.hoursOf(key, when),
    });
  }
}
