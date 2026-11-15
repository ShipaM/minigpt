import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { AuthResponse } from '@minigpt/contracts';
import { toUserResponse } from '../users/user.mapper.ts';
import type { UserEntity } from '../users/user.entity.ts';
import { UsersService } from '../users/users.service.ts';
import type { LoginDto } from './dto/login.dto.ts';
import type { RegisterDto } from './dto/register.dto.ts';
import { PasswordService } from './password.service.ts';
import { TokensService } from './tokens.service.ts';

/** What the controller needs: the JSON body and the refresh token for the cookie. */
export interface Session {
  response: AuthResponse;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  // A real hash of a random password: used so that "unknown email" takes as long as "wrong password".
  private dummyHash?: Promise<string>;

  constructor(
    private readonly users: UsersService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokensService,
  ) {}

  async register(dto: RegisterDto): Promise<Session> {
    const passwordHash = await this.passwords.hash(dto.password);

    const user = await this.users.createUser({
      email: dto.email,
      displayName: dto.displayName,
      passwordHash,
    });

    return this.startSession(user);
  }

  async login(dto: LoginDto): Promise<Session> {
    const user = await this.users.findByEmailWithPassword(dto.email);

    // Always spend the hashing time, even for an unknown email: otherwise response time reveals which emails exist.
    const hashToCheck = user?.passwordHash ?? (await this.getDummyHash());

    const passwordOk = await this.passwords.verify(dto.password, hashToCheck);

    // One message for both cases: the client must not learn which part was wrong.
    if (!user || !passwordOk) throw new UnauthorizedException('Invalid email or password');

    return this.startSession(user);
  }

  async refresh(rawRefreshToken: string | undefined): Promise<Session> {
    if (!rawRefreshToken) throw new UnauthorizedException('Invalid refresh token');
    const { userId, token } = await this.tokens.rotateRefreshToken(rawRefreshToken);

    const user = await this.users.getUserById(userId);

    return {
      response: {
        accessToken: await this.tokens.signAccessToken(user.id),
        user: toUserResponse(user),
      },
      refreshToken: token,
    };
  }

  async logout(rawRefreshToken: string | undefined): Promise<void> {
    if (rawRefreshToken) await this.tokens.revokeRefreshToken(rawRefreshToken);
  }

  private async startSession(user: UserEntity): Promise<Session> {
    return {
      response: {
        accessToken: await this.tokens.signAccessToken(user.id),
        user: toUserResponse(user),
      },

      refreshToken: await this.tokens.issueRefreshToken(user.id),
    };
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= this.passwords.hash('not-a-real-password');

    return this.dummyHash;
  }
}
