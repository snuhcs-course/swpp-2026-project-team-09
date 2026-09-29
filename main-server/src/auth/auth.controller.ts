import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Public } from '../common/public.decorator.js';
import { AuthService } from './auth.service.js';
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
}
