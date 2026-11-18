/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { Controller, Get, Header, Param, Res } from '@nestjs/common';
import { type Response } from 'express';
import { Public } from '../common/public.decorator.js';
import { INVITE_PAGE_POLICY, invitePage } from './invite-page.js';

// An Invite Link's address, `PUBLIC_URL/invite/<token>`, opened in a browser: in a messenger's own browser, on an
// iPhone, whose build declares no link that opens the app, or without the app. A phone that verified the App Link
// opens the app without asking here. Open without a sign-in, and it looks nothing up.
@Public()
@Controller('invite')
export class InvitePageController {
  @Get(':token')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Content-Security-Policy', INVITE_PAGE_POLICY)
  @Header('X-Robots-Tag', 'noindex')
  page(@Param('token') token: string, @Res() response: Response): void {
    const { status, html } = invitePage(token);
    response.status(status).send(html);
  }
}
