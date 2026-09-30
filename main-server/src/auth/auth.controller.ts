import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CurrentUser, type SignedInUser } from '../common/current-user.decorator.js';
import { Public } from '../common/public.decorator.js';
import { AuthService } from './auth.service.js';
import { type RefreshDto, refreshSchema } from './dto/refresh.dto.js';
import { type SignInDto, signInSchema } from './dto/sign-in.dto.js';
import { TokensDto } from './dto/tokens.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // 401 when the ID token is invalid or expired, 403 when the account is outside SNU or its email is not verified.
  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  signIn(@Body({ schema: signInSchema }) body: SignInDto): Promise<TokensDto> {
    return this.auth.signIn(body.idToken);
  }

  // Open to a request without an access token, because the app refreshes once its access token has expired.
  // 401 when the refresh token is unknown, expired or revoked.
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body({ schema: refreshSchema }) body: RefreshDto): Promise<TokensDto> {
    return this.auth.refresh(body.refreshToken);
  }

  @Post('sign-out')
  @HttpCode(HttpStatus.NO_CONTENT)
  signOut(@CurrentUser() user: SignedInUser): Promise<void> {
    return this.auth.signOut(user);
  }
}
