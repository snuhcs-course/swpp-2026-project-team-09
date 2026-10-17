/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { Inject, Injectable } from '@nestjs/common';
import { MenusService } from '../menus/menus.service.js';
import { type Model, MODEL_PORT, runFeature } from './adapter.js';
import { chatAssistant } from './chat/chat-assistant.js';
import { type AssistantReplyDto } from './dto/assistant-messages.dto.js';
import { type ChatMessage, type Feature } from './feature.js';

@Injectable()
export class AssistantService {
  private readonly chat: Feature;

  constructor(
    @Inject(MODEL_PORT) private readonly model: Model,
    menus: MenusService,
  ) {
    this.chat = chatAssistant({ menus });
  }

  async reply(userId: string, messages: readonly ChatMessage[]): Promise<AssistantReplyDto> {
    const text = await runFeature(this.model, this.chat, { userId, now: new Date() }, messages);
    return { text };
  }
}
