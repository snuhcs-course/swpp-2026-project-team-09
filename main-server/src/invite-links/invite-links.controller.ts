import { Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CurrentUser, type SignedInUser } from '../common/current-user.decorator.js';
import { CreatedInviteLinkDto, InviteLinkDto } from './dto/invite-links.dto.js';
import { InviteLinksService } from './invite-links.service.js';

@Controller('invite-links')
export class InviteLinksController {
  constructor(private readonly inviteLinks: InviteLinksService) {}

  // A repeat creates one more link, which nobody notices, so it takes no Idempotency-Key.
  @Post()
  create(@CurrentUser() user: SignedInUser): Promise<CreatedInviteLinkDto> {
    return this.inviteLinks.create(user.id);
  }

  @Get(':token')
  lookUp(@CurrentUser() user: SignedInUser, @Param('token') token: string): Promise<InviteLinkDto> {
    return this.inviteLinks.lookUp(user.id, token);
  }

  @Post(':token/accept')
  @HttpCode(HttpStatus.NO_CONTENT)
  accept(@CurrentUser() user: SignedInUser, @Param('token') token: string): Promise<void> {
    return this.inviteLinks.accept(user.id, token);
  }
}
