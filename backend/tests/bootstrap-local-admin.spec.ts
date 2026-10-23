import { describe, expect, it } from 'vitest';
import { assertBootstrapAllowed, isLoopbackPostgresUrl } from '../src/auth/bootstrap-local-admin';

const validEnvironment = {
  NODE_ENV: 'development',
  HARAKA_ALLOW_LOCAL_STAFF_BOOTSTRAP: '1',
  DATABASE_URL: 'postgresql://user:password@localhost:5432/haraka',
};
const confirmation = ['--confirm-local-staff-bootstrap'];

describe('local staff bootstrap safeguards', () => {
  it('accepts only local PostgreSQL URLs', () => {
    expect(isLoopbackPostgresUrl(validEnvironment.DATABASE_URL)).toBe(true);
    expect(isLoopbackPostgresUrl('postgresql://user:password@127.0.0.1:5432/haraka')).toBe(true);
    expect(isLoopbackPostgresUrl('postgresql://user:password@[::1]:5432/haraka')).toBe(true);
    expect(isLoopbackPostgresUrl('postgresql://user:password@db.example.com:5432/haraka')).toBe(
      false,
    );
    expect(isLoopbackPostgresUrl('https://localhost/haraka')).toBe(false);
    expect(isLoopbackPostgresUrl('not-a-database-url')).toBe(false);
  });

  it('requires explicit development opt-in, confirmation flag, and local database', () => {
    expect(() => assertBootstrapAllowed(validEnvironment, confirmation)).not.toThrow();
    expect(() =>
      assertBootstrapAllowed({ ...validEnvironment, NODE_ENV: 'production' }, confirmation),
    ).toThrow('only when NODE_ENV=development');
    expect(() =>
      assertBootstrapAllowed(
        { ...validEnvironment, HARAKA_ALLOW_LOCAL_STAFF_BOOTSTRAP: undefined },
        confirmation,
      ),
    ).toThrow('HARAKA_ALLOW_LOCAL_STAFF_BOOTSTRAP=1');
    expect(() => assertBootstrapAllowed(validEnvironment, [])).toThrow(
      '--confirm-local-staff-bootstrap',
    );
    expect(() =>
      assertBootstrapAllowed(
        { ...validEnvironment, DATABASE_URL: 'postgresql://user:password@db:5432/haraka' },
        confirmation,
      ),
    ).toThrow('loopback IP');
  });
});
