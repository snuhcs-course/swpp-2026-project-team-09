/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Injectable } from '@nestjs/common';
import { type Position } from '../../common/geometry.js';
import { StudySpacesService } from '../../study-spaces/study-spaces.service.js';
import { studyAnswer, type StudyAnswer, type StudyWhat } from './study-lookup.js';
import { type StudyArea } from './study-near.js';
import { WayService } from './way.service.js';

// What "이 근처" reads: the User's way and day, and the 공부공간 layer as the User may use it.
@Injectable()
export class StudyAreaService {
  constructor(
    private readonly ways: WayService,
    private readonly studySpaces: StudySpacesService,
  ) {}

  async find(
    userId: string,
    what: StudyWhat,
    at: { now: Date; location: Position | null; area: StudyArea | null },
  ): Promise<StudyAnswer> {
    const { now, location, area } = at;
    if (area === null) {
      return { result: 'none', reason: 'no-area' };
    }
    const [way, buildings] = await Promise.all([
      this.ways.argsFor(userId, { fromPlaceId: null, toPlaceId: null, by: null }, { now, location }),
      this.studySpaces.listFor(userId),
    ]);
    return studyAnswer({ way, buildings, area, what });
  }
}
