/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser, type SignedInUser } from '../common/current-user.decorator.js';
import { WEEKDAYS } from './labels.js';
import { type TimetableReading } from './reading-checks.js';
import { TimetableReadingService } from './timetable-reading.service.js';

// More blocks than a week of classes has.
const MOST_BLOCKS = 80;

// The picture in base64, as the app's image picker gives it: at most 5 MB once decoded (the body limit is
// READING_BODY_LIMIT, json-body-limit.ts).
// With it, the blocks the phone found on the picture, each with its day, 24-hour times and fill colour: the model then
// reads only their text.
const CLOCK = /^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/u;
const readingSchema = z.strictObject({
  image: z
    .base64()
    .min(1)
    .max(Math.ceil((5 * 1024 * 1024 * 4) / 3) + 4),
  blocks: z
    .array(
      z.strictObject({
        weekday: z.enum(WEEKDAYS),
        start: z.string().regex(CLOCK),
        end: z.string().regex(CLOCK),
        colour: z
          .tuple([z.number().min(0).max(255), z.number().min(0).max(255), z.number().min(0).max(255)])
          .nullable(),
        // Its bottom fades out or runs under a bar: `end` is where its colour ends, and the model reads the true end.
        fades: z.boolean().default(false),
      }),
    )
    .max(MOST_BLOCKS)
    .nullable()
    .default(null),
});

// P15-52: a signed-in User's screenshot of a weekly timetable read into classes. Nothing is stored, so a repeat
// needs no key; it counts towards the User's readings of the day.
@Controller('timetable/readings')
export class TimetableReadingController {
  constructor(private readonly readings: TimetableReadingService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  read(
    @CurrentUser() user: SignedInUser,
    @Body({ schema: readingSchema }) body: z.infer<typeof readingSchema>,
  ): Promise<TimetableReading> {
    return this.readings.read(user.id, body.image, body.blocks);
  }
}
