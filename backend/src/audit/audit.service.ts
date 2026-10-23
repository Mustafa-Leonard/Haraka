import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service';

export interface AuditLogParams {
  actorId?: string;
  actorRole?: string;
  subjectId?: string;
  subjectType?: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  outcome: 'success' | 'failure' | 'partial';
  failReason?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(params: AuditLogParams): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: params.actorId,
          actorRole: params.actorRole,
          subjectId: params.subjectId,
          subjectType: params.subjectType,
          action: params.action as any,
          resource: params.resource,
          resourceId: params.resourceId,
          oldValue: params.oldValue ?? undefined,
          newValue: params.newValue ?? undefined,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          requestId: params.requestId,
          outcome: params.outcome,
          failReason: params.failReason,
        },
      });
    } catch (err: any) {
      // In development or when DB is not ready, don't crash business operations on audit logging
      this.logger.debug(`Audit log fallback [${params.action}] on ${params.resource}: ${params.outcome}`);
    }
  }
}
