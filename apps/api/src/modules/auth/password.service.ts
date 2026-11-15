import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

// Cost parameters of scrypt (see the OWASP Password Storage Cheat Sheet). They are written into every hash,
// so they can be raised later without breaking hashes created earlier.
const COST = { N: 2 ** 16, r: 8, p: 1 } as const;

// scrypt needs about 128 * N * r bytes of memory (64 MiB here); the Node default limit is only 32 MiB.
const MAX_MEMORY = 256 * 1024 * 1024;

function derive(password: string, salt: Buffer, N: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // NFKC: visually identical passwords typed on different devices become the same bytes.
    scrypt(
      password.normalize('NFKC'),
      salt,
      KEY_LENGTH,
      { N, r, p, maxmem: MAX_MEMORY },
      (err, key) => (err ? reject(err) : resolve(key)),
    );
  });
}

//Password hashing with scrypt (built into Node: no native modules to build).
@Injectable()
export class PasswordService {
  /** Returns a self-describing string: `scrypt$N$r$p$salt$hash` (salt and hash in base64). */
  async hash(password: string): Promise<string> {
    const salt = randomBytes(SALT_LENGTH);
    const key = await derive(password, salt, COST.N, COST.r, COST.p);
    return ['scrypt', COST.N, COST.r, COST.p, salt.toString('base64'), key.toString('base64')].join(
      '$',
    );
  }

  //Never throws on a malformed hash: it simply does not match.
  async verify(password: string, stored: string): Promise<boolean> {
    const [scheme, nRaw, rRaw, pRaw, saltRaw, keyRaw] = stored.split('$');
    if (scheme !== 'scrypt' || !nRaw || !rRaw || !pRaw || !saltRaw || !keyRaw) return false;

    const N = Number(nRaw);
    const r = Number(rRaw);
    const p = Number(pRaw);
    if (![N, r, p].every(Number.isSafeInteger) || N < 2 || N > 2 ** 20) return false;

    const expected = Buffer.from(keyRaw, 'base64');
    const actual = await derive(password, Buffer.from(saltRaw, 'base64'), N, r, p).catch(
      () => null,
    );
    // Constant-time comparison: the time does not reveal how many leading bytes matched.
    return (
      actual !== null && actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  }
}
