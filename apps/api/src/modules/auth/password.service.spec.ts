import { describe, expect, it } from 'vitest';
import { PasswordService } from './password.service.ts';
describe('PasswordService', () => {
  const service = new PasswordService();
  it('produces a self-describing, salted hash that never contains the password', async () => {
    const a = await service.hash('correct horse battery');
    const b = await service.hash('correct horse battery');
    expect(a).toMatch(/^scrypt\$65536\$8\$1\$/);
    expect(a).not.toContain('correct horse');
    expect(a).not.toBe(b); // different salts
  });
  it('accepts the right password and rejects a wrong one', async () => {
    const hash = await service.hash('correct horse battery');
    expect(await service.verify('correct horse battery', hash)).toBe(true);
    expect(await service.verify('correct horse batterz', hash)).toBe(false);
    expect(await service.verify('', hash)).toBe(false);
  });
  it('treats canonically equivalent Unicode as the same password', async () => {
    const hash = await service.hash('caf\u00e9-password'); // é as one character
    expect(await service.verify('cafe\u0301-password', hash)).toBe(true); // e + combining accent
  });
  it('returns false (and does not throw) for malformed stored hashes', async () => {
    for (const bad of ['', 'plain', 'scrypt$1$2', 'bcrypt$1$2$3$4$5', 'scrypt$x$8$1$AA==$AA==']) {
      expect(await service.verify('anything', bad)).toBe(false);
    }
    // The empty hash that a migration may leave for old rows must never match.
    expect(await service.verify('', '')).toBe(false);
  });
});
