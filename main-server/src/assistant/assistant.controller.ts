/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CurrentUser, type SignedInUser } from '../common/current-user.decorator.js';
import { AssistantService } from './assistant.service.js';
import {
  type AssistantMessages,
  assistantMessagesSchema,
  type AssistantReplyDto,
} from './dto/assistant-messages.dto.js';

@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistant: AssistantService) {}

  // The chat Assistant's reply to the conversation. It changes nothing, so a repeat only asks the model again.
  @Post('messages')
  @HttpCode(HttpStatus.OK)
  reply(
    @CurrentUser() user: SignedInUser,
    @Body({ schema: assistantMessagesSchema }) { messages }: AssistantMessages,
  ): Promise<AssistantReplyDto> {
    return this.assistant.reply(user.id, messages);
  }
}
