import {
  advanceRelayPulse,
  cancelRelayPulse,
  confirmRelayPulseActionApplied,
  startRelayPulse
} from '../actions/relayPulse.js';
import { evaluateRelayTiming } from '../actions/relayTiming.js';

describe('relay pulse actions', () => {
  it('requests Pulse ON and preserves the prior OFF state without starting the timer yet', () => {
    expect(
      startRelayPulse({ type: 'pulse', relayOn: true, durationMs: 5_000 }, false)
    ).toEqual({
      requestedAction: { type: 'set', relayOn: true },
      nextState: {
        status: 'pending-start',
        targetRelayOn: true,
        restoreRelayOn: false,
        durationMs: 5_000
      },
      phase: 'pending-start'
    });
  });

  it('requests Pulse OFF and preserves the prior ON state without starting the timer yet', () => {
    expect(
      startRelayPulse({ type: 'pulse', relayOn: false, durationMs: 5_000 }, true)
    ).toEqual({
      requestedAction: { type: 'set', relayOn: false },
      nextState: {
        status: 'pending-start',
        targetRelayOn: false,
        restoreRelayOn: true,
        durationMs: 5_000
      },
      phase: 'pending-start'
    });
  });

  it.each([
    { relayOn: true, currentRelayOn: true },
    { relayOn: false, currentRelayOn: false }
  ])(
    'restores the actual prior state when Pulse target was already $relayOn',
    ({ relayOn, currentRelayOn }) => {
      const started = startRelayPulse(
        { type: 'pulse', relayOn, durationMs: 5_000 },
        currentRelayOn
      );

      expect(started.nextState).toMatchObject({ restoreRelayOn: currentRelayOn });
    }
  );

  it('keeps a blocked start pending without consuming pulse duration', () => {
    const pending = startRelayPulse(
      { type: 'pulse', relayOn: true, durationMs: 5_000 },
      false
    ).nextState!;

    expect(advanceRelayPulse(pending, 60_000)).toEqual({
      requestedAction: { type: 'set', relayOn: true },
      nextState: pending,
      phase: 'pending-start'
    });
  });

  it('starts the timer only after the target Set action is confirmed applied', () => {
    const pending = startRelayPulse(
      { type: 'pulse', relayOn: true, durationMs: 5_000 },
      false
    ).nextState!;

    expect(
      confirmRelayPulseActionApplied(pending, { type: 'set', relayOn: true }, 20_000)
    ).toEqual({
      requestedAction: null,
      nextState: {
        status: 'active',
        targetRelayOn: true,
        restoreRelayOn: false,
        expiresAtMs: 25_000
      },
      phase: 'started'
    });
  });

  it('arms duration from the actual transition time after minimum-OFF releases', () => {
    const started = startRelayPulse(
      { type: 'pulse', relayOn: true, durationMs: 5_000 },
      false
    );
    const pending = started.nextState!;
    const policy = { minimumOnMs: 0, minimumOffMs: 120_000 };
    const blocked = evaluateRelayTiming({
      action: started.requestedAction!,
      policy,
      state: { relayOn: false, lastChangeMs: 0 },
      nowMs: 30_000
    });

    expect(blocked.blockedBy).toBe('minimum-off');
    expect(confirmRelayPulseActionApplied(pending, blocked.appliedAction, 30_000)).toEqual({
      requestedAction: null,
      nextState: pending,
      phase: 'pending-start'
    });
    expect(advanceRelayPulse(pending, 119_999).phase).toBe('pending-start');

    const allowed = evaluateRelayTiming({
      action: advanceRelayPulse(pending, 120_000).requestedAction!,
      policy,
      state: { relayOn: false, lastChangeMs: 0 },
      nowMs: 120_000
    });
    expect(allowed.blockedBy).toBeNull();
    expect(
      confirmRelayPulseActionApplied(pending, allowed.appliedAction, 120_000).nextState
    ).toMatchObject({
      status: 'active',
      expiresAtMs: 125_000
    });
  });

  it('keeps requesting the pulse target before expiry', () => {
    const state = {
      status: 'active' as const,
      targetRelayOn: true,
      restoreRelayOn: false,
      expiresAtMs: 15_000
    };

    expect(advanceRelayPulse(state, 14_999)).toEqual({
      requestedAction: { type: 'set', relayOn: true },
      nextState: state,
      phase: 'active'
    });
  });

  it('requests restore at expiry but keeps it pending until the Set action is applied', () => {
    expect(
      advanceRelayPulse(
        {
          status: 'active',
          targetRelayOn: true,
          restoreRelayOn: false,
          expiresAtMs: 15_000
        },
        15_000
      )
    ).toEqual({
      requestedAction: { type: 'set', relayOn: false },
      nextState: {
        status: 'pending-restore',
        targetRelayOn: true,
        restoreRelayOn: false
      },
      phase: 'pending-restore'
    });
  });

  it('retries a blocked restore instead of losing pulse state', () => {
    const state = {
      status: 'pending-restore' as const,
      targetRelayOn: true,
      restoreRelayOn: false
    };

    expect(advanceRelayPulse(state, 60_000)).toEqual({
      requestedAction: { type: 'set', relayOn: false },
      nextState: state,
      phase: 'pending-restore'
    });
  });

  it('keeps restore pending until minimum-ON releases and the restore is applied', () => {
    const active = {
      status: 'active' as const,
      targetRelayOn: true,
      restoreRelayOn: false,
      expiresAtMs: 105_000
    };
    const expired = advanceRelayPulse(active, 105_000);
    const pendingRestore = expired.nextState!;
    const policy = { minimumOnMs: 30_000, minimumOffMs: 0 };
    const blocked = evaluateRelayTiming({
      action: expired.requestedAction!,
      policy,
      state: { relayOn: true, lastChangeMs: 100_000 },
      nowMs: 105_000
    });

    expect(blocked.blockedBy).toBe('minimum-on');
    expect(
      confirmRelayPulseActionApplied(pendingRestore, blocked.appliedAction, 105_000)
    ).toEqual({
      requestedAction: null,
      nextState: pendingRestore,
      phase: 'pending-restore'
    });
    expect(advanceRelayPulse(pendingRestore, 129_999).phase).toBe('pending-restore');

    const restore = advanceRelayPulse(pendingRestore, 130_000);
    const allowed = evaluateRelayTiming({
      action: restore.requestedAction!,
      policy,
      state: { relayOn: true, lastChangeMs: 100_000 },
      nowMs: 130_000
    });
    expect(allowed.blockedBy).toBeNull();
    expect(
      confirmRelayPulseActionApplied(pendingRestore, allowed.appliedAction, 130_000)
    ).toEqual({
      requestedAction: null,
      nextState: null,
      phase: 'completed'
    });
  });

  it('clears pulse state only after the restore Set action is confirmed applied', () => {
    expect(
      confirmRelayPulseActionApplied(
        {
          status: 'pending-restore',
          targetRelayOn: true,
          restoreRelayOn: false
        },
        { type: 'set', relayOn: false },
        20_000
      )
    ).toEqual({
      requestedAction: null,
      nextState: null,
      phase: 'completed'
    });
  });

  it('does not restart an already active pulse when an applied action is acknowledged again', () => {
    const state = {
      status: 'active' as const,
      targetRelayOn: true,
      restoreRelayOn: false,
      expiresAtMs: 15_000
    };

    expect(
      confirmRelayPulseActionApplied(state, { type: 'set', relayOn: true }, 12_000)
    ).toEqual({
      requestedAction: null,
      nextState: state,
      phase: 'active'
    });
  });

  it('cancels without emitting a relay request so the higher-priority owner can decide', () => {
    expect(cancelRelayPulse()).toEqual({
      requestedAction: null,
      nextState: null,
      phase: 'cancelled'
    });
  });

  it.each([0, -1, Number.POSITIVE_INFINITY, Number.NaN])(
    'rejects invalid duration %s',
    (durationMs) => {
      expect(() =>
        startRelayPulse({ type: 'pulse', relayOn: true, durationMs }, false)
      ).toThrow('Relay pulse duration must be a positive finite number.');
    }
  );
});
