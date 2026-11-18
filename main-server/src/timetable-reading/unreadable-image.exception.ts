/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { HttpException } from '@nestjs/common';

// 422 UNREADABLE_IMAGE: the bytes sent are no picture the model takes (P15-52); the app then reads it on the phone.
export class UnreadableImageException extends HttpException {
  constructor() {
    super({ code: 'UNREADABLE_IMAGE', message: 'Not a PNG, JPEG, WebP or GIF picture of up to 5 MB' }, 422);
  }
}
