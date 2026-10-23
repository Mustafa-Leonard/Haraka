import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { JOB_TRANSITIONS, TERMINAL_JOB_STATES, type JobStatus } from '@haraka/shared-types';

@Injectable()
export class JobStateMachineService {
  /**
   * Asserts whether a transition from `fromStatus` to `toStatus` is strictly legal.
   * Throws ConflictException if invalid.
   */
  validateTransition(fromStatus: JobStatus, toStatus: JobStatus): void {
    if (TERMINAL_JOB_STATES.includes(fromStatus)) {
      throw new ConflictException({
        error: 'INVALID_STATE',
        message: `Job is in terminal state '${fromStatus}' and cannot be transitioned to '${toStatus}'.`,
      });
    }

    const allowed = JOB_TRANSITIONS[fromStatus] || [];
    if (!allowed.includes(toStatus)) {
      throw new ConflictException({
        error: 'INVALID_STATE',
        message: `Illegal state transition from '${fromStatus}' to '${toStatus}'. Allowed: [${allowed.join(', ')}]`,
      });
    }
  }

  isTerminal(status: JobStatus): boolean {
    return TERMINAL_JOB_STATES.includes(status);
  }
}
