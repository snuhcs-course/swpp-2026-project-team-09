import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AdministratorOnly } from '../common/administrator-only.decorator.js';
import { CurrentAdministrator, type SignedInAdministrator } from '../common/current-administrator.decorator.js';
import { Public } from '../common/public.decorator.js';
import { AdministratorAuthService } from './administrator-auth.service.js';
import { AdministratorAccountDto } from './dto/administrator-account.dto.js';
import { AdministratorTokenDto } from './dto/administrator-token.dto.js';
import { type SignInDto, signInSchema } from './dto/sign-in.dto.js';

@Controller('admin/auth')
export class AdministratorAuthController {
  constructor(private readonly auth: AdministratorAuthService) {}

  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  signIn(@Body({ schema: signInSchema }) body: SignInDto): Promise<AdministratorTokenDto> {
    return this.auth.signIn(body.idToken);
  }

  @AdministratorOnly()
  @Get('me')
  me(@CurrentAdministrator() administrator: SignedInAdministrator): Promise<AdministratorAccountDto> {
    return this.auth.account(administrator.id);
  }

  @AdministratorOnly()
  @Post('sign-out')
  @HttpCode(HttpStatus.NO_CONTENT)
  signOut(@CurrentAdministrator() administrator: SignedInAdministrator): Promise<void> {
    return this.auth.signOut(administrator.id);
  }
}
