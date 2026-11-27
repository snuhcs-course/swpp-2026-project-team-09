/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { type Position } from '../../common/geometry.js';
import { PlaceLookup } from '../../places/place-lookup.js';
import { StudySpacesService } from '../../study-spaces/study-spaces.service.js';
import { type AnswerReply, type LeftOutClass, type LocationMissing, type StudyInput } from '../dto/answer.dto.js';
import { type DayItem } from '../free-time/free-time.js';
import { idsOn, skippedOut } from '../free-time/left-out-classes.js';
import { UserDayService } from '../free-time/user-day.service.js';
import { MINUTE_MS } from '../gathering/gathering.js';
import { type Catalogue, LIBRARY_CATALOGUE } from '../library/catalogue.js';
import { isTogether } from './study-group.js';
import { StudyGroupService } from './study-group.service.js';
import { readyAt, studyPlanAnswer } from './study-plan.js';
import { WayService } from './way.service.js';

// What a study answer reads (P10 ticket 03): the User's day from when they are ready, where they set out from, the
// 공부공간 layer as the User may use it with each space's hours, and the User's Friends for the time card's "+ 같이".
// Together, it is the group study room answer (ticket 07). The chat's tools and the recalculation call it.
@Injectable()
export class StudyPlanService {
  constructor(
    private readonly ways: WayService,
    private readonly studySpaces: StudySpacesService,
    private readonly places: PlaceLookup,
    private readonly groups: StudyGroupService,
    private readonly days: UserDayService,
    @Inject(LIBRARY_CATALOGUE) private readonly catalogue: Catalogue,
  ) {}

  // The asker's Classes of the day, among which a tool names a Class to leave out (P05 ticket 70).
  readonly classesOn = (askerId: string, date: string): Promise<DayItem[]> => this.days.classesOn(askerId, date);

  // Where the User is counts only when they set out now; a `from` constraint names where they set out from. The asker's
  // Classes the conversation leaves out (P05 ticket 70) are free.
  async plan(
    askerId: string,
    input: StudyInput,
    at: {
      now: Date;
      location: Position | null;
      locationMissing?: LocationMissing;
      skipped?: readonly LeftOutClass[];
    },
  ): Promise<AnswerReply> {
    const [asker] = input.people;
    if (asker?.userId !== askerId) {
      throw new BadRequestException('The first person of a plan is the asker');
    }
    if (isTogether(input)) {
      return (await this.groups.plan(askerId, input, at)).answer;
    }
    const [fromPlaceId = null] = asker.constraints.flatMap((one) => (one.kind === 'from' ? [one.placeId] : []));
    if (fromPlaceId !== null && this.places.byId(fromPlaceId) === null) {
      throw new BadRequestException('No such Place');
    }
    const ready = readyAt(input, at.now);
    const now = ready.getTime() - at.now.getTime() < MINUTE_MS;
    const [read, buildings, others] = await Promise.all([
      this.ways.argsFor(
        askerId,
        { fromPlaceId, toPlaceId: null, by: null },
        { now: ready, location: now ? at.location : null, locationMissing: now ? at.locationMissing : null },
      ),
      this.studySpaces.listFor(askerId),
      this.groups.othersOf(askerId, input),
    ]);
    const way = { ...read, me: { ...read.me, ...skippedOut(read.me.items, idsOn(at.skipped ?? [], input.date)) } };
    return studyPlanAnswer({
      input,
      way,
      now: at.now,
      buildings,
      others,
      hoursOf: (key, when) => this.studySpaces.hoursOf(key, when),
      catalogue: this.catalogue,
    });
  }
}
