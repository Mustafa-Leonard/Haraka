import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { AdminController } from '../src/admin/admin.controller';
import { ROLES_KEY } from '../src/auth/decorators/roles.decorator';

function allowedRoles(method: string): string[] {
  const handler = (AdminController.prototype as unknown as Record<string, object>)[method];
  return Reflect.getMetadata(ROLES_KEY, handler) as string[];
}

describe('admin route role boundaries', () => {
  it.each([
    ['getDashboard', ['ADMIN', 'SUPER_ADMIN']],
    ['getFleet', ['ADMIN', 'SUPER_ADMIN', 'DISPATCHER']],
    ['getJobs', ['ADMIN', 'SUPER_ADMIN', 'DISPATCHER', 'SUPPORT']],
    ['assignJob', ['ADMIN', 'SUPER_ADMIN', 'DISPATCHER']],
    ['cancelJob', ['ADMIN', 'SUPER_ADMIN', 'DISPATCHER']],
    ['getRiders', ['ADMIN', 'SUPER_ADMIN', 'VERIFICATION_OFFICER']],
    ['approveRider', ['ADMIN', 'SUPER_ADMIN', 'VERIFICATION_OFFICER']],
    ['rejectRider', ['ADMIN', 'SUPER_ADMIN', 'VERIFICATION_OFFICER']],
    ['reactivateRider', ['ADMIN', 'SUPER_ADMIN']],
    ['suspendRider', ['ADMIN', 'SUPER_ADMIN']],
    ['getPricingRules', ['ADMIN', 'SUPER_ADMIN']],
    ['createPricingRule', ['ADMIN', 'SUPER_ADMIN']],
    ['updatePricingRule', ['ADMIN', 'SUPER_ADMIN']],
    ['getServiceZones', ['ADMIN', 'SUPER_ADMIN']],
    ['createServiceZone', ['ADMIN', 'SUPER_ADMIN']],
    ['getLedgerSummary', ['ADMIN', 'SUPER_ADMIN', 'FINANCE']],
    ['getLedgerTransactions', ['ADMIN', 'SUPER_ADMIN', 'FINANCE']],
    ['getDisputes', ['ADMIN', 'SUPER_ADMIN', 'DISPATCHER', 'SUPPORT']],
    ['getDispute', ['ADMIN', 'SUPER_ADMIN', 'DISPATCHER', 'SUPPORT']],
    ['resolveDispute', ['ADMIN', 'SUPER_ADMIN', 'DISPATCHER']],
    ['escalateDispute', ['ADMIN', 'SUPER_ADMIN', 'DISPATCHER', 'SUPPORT']],
    ['getAuditLogs', ['ADMIN', 'SUPER_ADMIN']],
  ])('%s grants only the expected roles', (method, roles) => {
    expect(allowedRoles(method)).toEqual(roles);
  });
});
