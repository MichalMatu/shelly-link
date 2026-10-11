from pathlib import Path

path = Path('packages/script-generator/src/__tests__/manual-runtime.test.ts')
text = path.read_text(encoding='utf-8')
sentinel = "  it('latches native Shelly protection errors immediately and preserves the first cause', () => {\n"
if sentinel not in text:
    raise SystemExit('manual-runtime insertion sentinel not found')
block = r'''  it('preserves an automation fault across MANUAL hard-safety recovery', () => {
    let nowMs = 1_000_000;
    const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => nowMs);
    try {
      const runtime = createHeatingRuntime();
      runtime.scan(23.5, 50);
      runtime.runtime.enterManual();
      expect(runtime.runtime.manualOn()).toBe(1);
      expect(runtime.physicalRelayOn()).toBe(true);

      nowMs += 700_000;
      runtime.runtime.stale();
      expect(runtime.controlState()).toMatchObject({
        mode: 'manual',
        manualRequestOn: true,
        automationFault: 'st',
        safetyLockout: false
      });
      expect(runtime.physicalRelayOn()).toBe(true);

      runtime.runtime.hardLock();
      expect(runtime.controlState()).toMatchObject({
        mode: 'manual',
        manualRequestOn: true,
        automationFault: 'st',
        safetyLockout: true,
        safetyReason: 'mx'
      });
      expect(runtime.physicalRelayOn()).toBe(false);

      expect(decodeClimateRuntimeControlState(runtime.runtime.resetSafety())).toMatchObject({
        mode: 'manual',
        manualRequestOn: false,
        automationFault: 'st',
        safetyLockout: false,
        safetyReason: null
      });
      expect(runtime.physicalRelayOn()).toBe(false);

      expect(runtime.runtime.manualOn()).toBe(1);
      expect(runtime.physicalRelayOn()).toBe(true);
      expect(runtime.controlState().automationFault).toBe('st');
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('keeps AUTO safe OFF after hard-safety recovery until fresh input clears the fault', () => {
    let nowMs = 1_000_000;
    const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => nowMs);
    try {
      const runtime = createHeatingRuntime();
      runtime.scan(23.5, 50);
      expect(runtime.controlState().automationFault).toBeNull();

      nowMs += 700_000;
      runtime.runtime.stale();
      runtime.runtime.hardLock();
      expect(runtime.controlState()).toMatchObject({
        mode: 'auto',
        manualRequestOn: false,
        automationFault: 'st',
        safetyLockout: true,
        safetyReason: 'mx'
      });
      expect(runtime.physicalRelayOn()).toBe(false);

      expect(decodeClimateRuntimeControlState(runtime.runtime.resetSafety())).toMatchObject({
        mode: 'auto',
        manualRequestOn: false,
        automationFault: 'st',
        safetyLockout: false,
        safetyReason: null
      });
      expect(runtime.physicalRelayOn()).toBe(false);

      nowMs += 1_000;
      runtime.scan(18, 50);
      expect(runtime.controlState().automationFault).toBeNull();
      expect(runtime.physicalRelayOn()).toBe(true);
    } finally {
      nowSpy.mockRestore();
    }
  });

'''
if block in text:
    raise SystemExit('test block already present')
path.write_text(text.replace(sentinel, block + sentinel, 1), encoding='utf-8')
