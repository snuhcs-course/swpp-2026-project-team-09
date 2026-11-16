/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Injectable } from '@nestjs/common';
import { CafeLookupService } from './cafe.service.js';
import { DayLookupService } from './day.service.js';
import { FriendLookupService } from './friend.service.js';
import { MenuLookupService } from './menu.service.js';
import { StudyAreaService } from './study.service.js';
import { TutorialOrderService } from './tutorial-order.service.js';
import { WayService } from './way.service.js';

// The reads of every Lookup drawn on the map, given to the chat's tools as one.
@Injectable()
export class LookupServices {
  constructor(
    readonly ways: WayService,
    readonly menus: MenuLookupService,
    readonly friends: FriendLookupService,
    readonly days: DayLookupService,
    readonly tutorial: TutorialOrderService,
    readonly studyAreas: StudyAreaService,
    readonly cafes: CafeLookupService,
  ) {}
}
