/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser, type SignedInUser } from '../common/current-user.decorator.js';
import { type TimetableReading } from './reading-checks.js';
import { TimetableReadingService } from './timetable-reading.service.js';

// More blocks than a week of classes has.
const MOST_BLOCKS = 80;

// The picture in base64, as the app's image picker gives it: at most 5 MB once decoded (the body limit is
// READING_BODY_LIMIT, json-body-limit.ts).
// With it, what the phone found on the picture from its pixels alone (`gridGeometry` in the app): how many day columns,
// and each class block's column, top and bottom in the picture's pixels, fill colour and whether its bottom fades out.
// The model then reads the labels and each block's text and rough times, and the code places the blocks.
const colour = z.number().min(0).max(255);
const readingSchema = z.strictObject({
  image: z
    .base64()
    .min(1)
    .max(Math.ceil((5 * 1024 * 1024 * 4) / 3) + 4),
  grid: z
    .strictObject({
      columns: z.int().min(1).max(7),
      blocks: z
        .array(
          z.strictObject({
            column: z.int().min(0).max(6),
            top: z.number().min(0),
            bottom: z.number().min(0),
            colour: z.tuple([colour, colour, colour]).nullable(),
            fades: z.boolean().default(false),
          }),
        )
        .max(MOST_BLOCKS),
    })
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
    return this.readings.read(user.id, body.image, body.grid);
  }
}
