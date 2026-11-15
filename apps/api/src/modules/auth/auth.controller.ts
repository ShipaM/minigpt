import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthResponse, UserResponse } from '@minigpt/contracts';
import { toUserResponse } from '../users/user.mapper.ts';
import { UsersService } from '../users/users.service.ts';
import { AuthService, type Session } from './auth.service.ts';
import { AuthSettings } from './auth.settings.ts';
import { CurrentUser, type AuthenticatedUser } from './current-user.decorator.ts';
import { LoginDto } from './dto/login.dto.ts';
import { RegisterDto } from './dto/register.dto.ts';
import { Public } from './public.decorator.ts';
import {
  buildClearedRefreshCookie,
  buildRefreshCookie,
  readRefreshCookie,
} from './refresh-cookie.ts';

// Minimal request/response shapes: we do not pull in express types for two methods.
interface RequestLike {
  headers: { cookie?: string };
}

interface ResponseLike {
  setHeader(name: string, value: string): unknown;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
    private readonly settings: AuthSettings,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: ResponseLike,
  ): Promise<AuthResponse> {
    return this.respond(res, await this.auth.register(dto));
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: ResponseLike,
  ): Promise<AuthResponse> {
    return this.respond(res, await this.auth.login(dto));
  }

  //Public for the guard (no access token yet), but protected by the refresh cookie.
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: RequestLike,
    @Res({ passthrough: true }) res: ResponseLike,
  ): Promise<AuthResponse> {
    return this.respond(res, await this.auth.refresh(readRefreshCookie(req.headers.cookie)));
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: RequestLike,
    @Res({ passthrough: true }) res: ResponseLike,
  ): Promise<void> {
    await this.auth.logout(readRefreshCookie(req.headers.cookie));
    res.setHeader('Set-Cookie', buildClearedRefreshCookie(this.settings.secureCookies));
  }

  @ApiBearerAuth()
  @Get('me')
  async me(@CurrentUser() current: AuthenticatedUser): Promise<UserResponse> {
    return toUserResponse(await this.users.getUserById(current.id));
  }

  private respond(res: ResponseLike, session: Session): AuthResponse {
    res.setHeader(
      'Set-Cookie',
      buildRefreshCookie(session.refreshToken, {
        secure: this.settings.secureCookies,
        maxAgeSeconds: this.settings.refreshTtlSeconds,
      }),
    );
    return session.response;
  }
}
