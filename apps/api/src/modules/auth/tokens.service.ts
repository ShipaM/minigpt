import { createHash, randomBytes } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository, type EntityManager } from 'typeorm';
import { AuthSettings } from './auth.settings.ts';
import { RefreshTokenEntity } from './refresh-token.entity.ts';

const INVALID_REFRESH = 'Invalid refresh token';

//What happened when a refresh token was presented. The error is thrown only after the transaction commits. */
type RotationResult =
  { kind: 'ok'; userId: string; token: string } | { kind: 'invalid' } | { kind: 'reused' };

const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

@Injectable()
export class TokensService {
  constructor(
    private readonly jwt: JwtService,
    private readonly settings: AuthSettings,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokens: Repository<RefreshTokenEntity>,
  ) {}

  // ---- access token (JWT) ----------------------------------------------------------------------

  signAccessToken(userId: string): Promise<string> {
    return this.jwt.signAsync({ sub: userId });
  }

  // Returns the user id from a valid token. Any problem (signature, expiry, shape) is the same 401.
  async verifyAccessToken(token: string): Promise<string> {
    try {
      const payload = await this.jwt.verifyAsync<{ sub?: unknown }>(token);
      if (typeof payload.sub !== 'string') throw new Error('no subject');
      return payload.sub;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  // ---- refresh token (opaque, stored hashed) ------------------------------------------------------

  /** Creates a refresh token for the user and returns the raw value (it exists only here and in the cookie). */
  issueRefreshToken(userId: string, manager?: EntityManager): Promise<string> {
    return this.insertRefreshToken(
      manager?.getRepository(RefreshTokenEntity) ?? this.refreshTokens,
      userId,
    );
  }

  //Exchanges a refresh token for a new one (rotation): the presented token is revoked.
  //Presenting an already revoked token means a copy was stolen: all sessions of that user are revoked.
  async rotateRefreshToken(rawToken: string): Promise<{ userId: string; token: string }> {
    const result = await this.refreshTokens.manager.transaction(
      async (manager): Promise<RotationResult> => {
        const repo = manager.getRepository(RefreshTokenEntity);
        // FOR UPDATE: two parallel requests with the same token are processed one after another.
        const found = await repo.findOne({
          where: { tokenHash: sha256(rawToken) },
          lock: { mode: 'pessimistic_write' },
        });
        if (!found) return { kind: 'invalid' };
        if (found.revokedAt) {
          await repo.update(
            { userId: found.userId, revokedAt: IsNull() },
            { revokedAt: new Date() },
          );
          return { kind: 'reused' };
        }
        if (found.expiresAt.getTime() <= Date.now()) return { kind: 'invalid' };
        await repo.update({ id: found.id }, { revokedAt: new Date() });
        return {
          kind: 'ok',
          userId: found.userId,
          token: await this.insertRefreshToken(repo, found.userId),
        };
      },
    );
    // Throwing inside the transaction would roll back the "revoke everything" update, so we throw here.
    if (result.kind !== 'ok') throw new UnauthorizedException(INVALID_REFRESH);
    return { userId: result.userId, token: result.token };
  }

  //Revokes one refresh token (logout). Unknown or already revoked tokens are ignored: logout is idempotent.
  async revokeRefreshToken(rawToken: string): Promise<void> {
    await this.refreshTokens.update(
      { tokenHash: sha256(rawToken), revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  private async insertRefreshToken(
    repo: Repository<RefreshTokenEntity>,
    userId: string,
  ): Promise<string> {
    const raw = randomBytes(32).toString('base64url'); // 256 bits of randomness
    await repo.save(
      repo.create({
        userId,
        tokenHash: sha256(raw),
        expiresAt: new Date(Date.now() + this.settings.refreshTtlSeconds * 1000),
        revokedAt: null,
      }),
    );
    return raw;
  }
}
