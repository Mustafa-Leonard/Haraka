import { describe, expect, it } from 'vitest';
import {
  ADMIN_WORKSPACE_ACCESS,
  getStaffHomePath,
  STAFF_PORTAL_ROLES,
} from '../../packages/shared-types/src/auth';
import { passwordLoginSchema } from '../../packages/validation/src/auth.schema';
import { riderVerificationRejectionSchema } from '../../packages/validation/src/rider.schema';

describe('staff workspace role selection', () => {
  it('allows the supported staff roles in password login validation', () => {
    for (const role of STAFF_PORTAL_ROLES) {
      expect(
        passwordLoginSchema.safeParse({
          phone: '0712345678',
          password: 'local-test-password',
          role,
        }).success,
      ).toBe(true);
    }
  });

  it.each([
    ['ADMIN', '/admin'],
    ['DISPATCHER', '/admin/fleet'],
    ['SUPPORT', '/admin/jobs'],
    ['FINANCE', '/admin/ledger'],
    ['VERIFICATION_OFFICER', '/admin/riders'],
  ])('routes %s to its own landing page', (role, route) => {
    expect(getStaffHomePath([role])).toBe(route);
  });

  it('keeps role page grants separated', () => {
    expect(ADMIN_WORKSPACE_ACCESS['/admin/ledger']).toContain('FINANCE');
    expect(ADMIN_WORKSPACE_ACCESS['/admin/ledger']).not.toContain('SUPPORT');
    expect(ADMIN_WORKSPACE_ACCESS['/admin/riders']).toContain('VERIFICATION_OFFICER');
    expect(ADMIN_WORKSPACE_ACCESS['/admin/riders']).not.toContain('DISPATCHER');
  });

  it('requires a meaningful rejection reason for verification decisions', () => {
    expect(riderVerificationRejectionSchema.safeParse({ reason: 'No documents' }).success).toBe(
      true,
    );
    expect(riderVerificationRejectionSchema.safeParse({ reason: '  ' }).success).toBe(false);
  });
});
