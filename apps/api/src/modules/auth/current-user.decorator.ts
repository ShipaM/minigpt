import { createParamDecorator, UnauthorizedException, type ExecutionContext } from '@nestjs/common';

//Who is making the request. Filled in by JwtAuthGuard from the verified access token.
export interface AuthenticatedUser {
  id: string;
}
//Usage: `me(@CurrentUser() user: AuthenticatedUser)`.
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    // Only possible if an endpoint is @Public() but still asks for a user: a programming error.
    if (!request.user) throw new UnauthorizedException();
    return request.user;
  },
);
