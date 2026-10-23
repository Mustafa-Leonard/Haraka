import { describe, expect, it } from 'vitest';
import { validateConfig } from '../src/common/config/config.validator';

describe('validateConfig field encryption key', () => {
  it('accepts the development default key', () => {
    expect(() => validateConfig({ NODE_ENV: 'development' })).not.toThrow();
  });

  it('rejects keys that are not 32-byte hexadecimal values in development', () => {
    expect(() =>
      validateConfig({ NODE_ENV: 'development', FIELD_ENCRYPTION_KEY: 'a'.repeat(48) }),
    ).toThrow('FIELD_ENCRYPTION_KEY must be a 64-character hexadecimal key');
    expect(() =>
      validateConfig({ NODE_ENV: 'development', FIELD_ENCRYPTION_KEY: 'z'.repeat(64) }),
    ).toThrow('FIELD_ENCRYPTION_KEY must be a 64-character hexadecimal key');
  });

  it('accepts a 32-byte hexadecimal key in development', () => {
    expect(() =>
      validateConfig({ NODE_ENV: 'development', FIELD_ENCRYPTION_KEY: 'a'.repeat(64) }),
    ).not.toThrow();
  });

  it('permits the MFA bypass only as an explicit development setting', () => {
    expect(() =>
      validateConfig({
        NODE_ENV: 'development',
        HARAKA_DEV_STAFF_MFA_BYPASS: '1',
      }),
    ).not.toThrow();
    expect(() =>
      validateConfig({
        NODE_ENV: 'production',
        HARAKA_DEV_STAFF_MFA_BYPASS: '1',
      }),
    ).toThrow('available only when NODE_ENV=development');
    expect(() =>
      validateConfig({
        NODE_ENV: 'development',
        HARAKA_DEV_STAFF_MFA_BYPASS: 'true',
      }),
    ).toThrow('HARAKA_DEV_STAFF_MFA_BYPASS must be 0 or 1');
  });
});
