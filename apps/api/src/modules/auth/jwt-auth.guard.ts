import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedUser } from './current-user.decorator.ts';
import { IS_PUBLIC_KEY } from './public.decorator.ts';
import { TokensService } from './tokens.service.ts';

interface RequestLike {
  headers: { authorization?: string };
  user?: AuthenticatedUser;
}

//Registered globally: every endpoint requires a valid access token unless it is marked @Public().
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokensService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<RequestLike>();

    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];

    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException('Missing access token');

    request.user = { id: await this.tokens.verifyAccessToken(token) };

    return true;
  }
}
