import { describe, it, expect } from 'vitest';

// ── Job State Machine transitions ─────────────────────────────────────────
// Mirrors JOB_TRANSITIONS from @haraka/shared-types / job-state-machine.service

const JOB_TRANSITIONS: Record<string, string[]> = {
  REQUESTED:      ['MATCHING', 'CANCELLED'],
  MATCHING:       ['OFFERED', 'CANCELLED'],
  OFFERED:        ['ACCEPTED', 'CANCELLED'],
  ACCEPTED:       ['ARRIVED_PICKUP', 'CANCELLED'],
  ARRIVED_PICKUP: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP:      ['IN_TRANSIT'],
  IN_TRANSIT:     ['ARRIVED_DROPOFF'],
  ARRIVED_DROPOFF:['DELIVERED', 'FAILED'],
  DELIVERED:      [],
  CANCELLED:      [],
  FAILED:         [],
};

function canTransition(from: string, to: string): boolean {
  return (JOB_TRANSITIONS[from] ?? []).includes(to);
}

function isTerminal(status: string): boolean {
  return ['DELIVERED', 'CANCELLED', 'FAILED'].includes(status);
}

describe('Job State Machine', () => {
  describe('valid transitions', () => {
    const valid: [string, string][] = [
      ['REQUESTED',       'MATCHING'],
      ['REQUESTED',       'CANCELLED'],
      ['MATCHING',        'OFFERED'],
      ['MATCHING',        'CANCELLED'],
      ['OFFERED',         'ACCEPTED'],
      ['OFFERED',         'CANCELLED'],
      ['ACCEPTED',        'ARRIVED_PICKUP'],
      ['ACCEPTED',        'CANCELLED'],
      ['ARRIVED_PICKUP',  'PICKED_UP'],
      ['ARRIVED_PICKUP',  'CANCELLED'],
      ['PICKED_UP',       'IN_TRANSIT'],
      ['IN_TRANSIT',      'ARRIVED_DROPOFF'],
      ['ARRIVED_DROPOFF', 'DELIVERED'],
      ['ARRIVED_DROPOFF', 'FAILED'],
    ];

    valid.forEach(([from, to]) => {
      it(`allows ${from} → ${to}`, () => {
        expect(canTransition(from, to)).toBe(true);
      });
    });
  });

  describe('invalid transitions', () => {
    const invalid: [string, string][] = [
      ['DELIVERED',       'CANCELLED'],
      ['CANCELLED',       'MATCHING'],
      ['FAILED',          'DELIVERED'],
      ['PICKED_UP',       'CANCELLED'],   // cannot cancel once picked up
      ['IN_TRANSIT',      'CANCELLED'],
      ['DELIVERED',       'REQUESTED'],
      ['REQUESTED',       'DELIVERED'],
      ['ARRIVED_DROPOFF', 'ARRIVED_PICKUP'],
    ];

    invalid.forEach(([from, to]) => {
      it(`blocks ${from} → ${to}`, () => {
        expect(canTransition(from, to)).toBe(false);
      });
    });
  });

  describe('terminal states', () => {
    it('DELIVERED is terminal', () => expect(isTerminal('DELIVERED')).toBe(true));
    it('CANCELLED is terminal', () => expect(isTerminal('CANCELLED')).toBe(true));
    it('FAILED is terminal', () => expect(isTerminal('FAILED')).toBe(true));
    it('IN_TRANSIT is not terminal', () => expect(isTerminal('IN_TRANSIT')).toBe(false));
    it('ACCEPTED is not terminal', () => expect(isTerminal('ACCEPTED')).toBe(false));
  });

  describe('all terminal states have no outgoing transitions', () => {
    ['DELIVERED', 'CANCELLED', 'FAILED'].forEach((s) => {
      it(`${s} has no transitions`, () => {
        expect(JOB_TRANSITIONS[s]).toEqual([]);
      });
    });
  });

  describe('state machine completeness', () => {
    it('every non-terminal state has at least one outgoing transition', () => {
      const nonTerminal = Object.keys(JOB_TRANSITIONS).filter((s) => !isTerminal(s));
      nonTerminal.forEach((s) => {
        expect(JOB_TRANSITIONS[s].length).toBeGreaterThan(0);
      });
    });

    it('all transition targets are known states', () => {
      const allStates = new Set(Object.keys(JOB_TRANSITIONS));
      Object.values(JOB_TRANSITIONS).flat().forEach((target) => {
        expect(allStates.has(target)).toBe(true);
      });
    });
  });
});
