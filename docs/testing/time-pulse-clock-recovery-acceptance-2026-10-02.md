# Time + Pulse clock-recovery acceptance — 2026-10-02

Code candidate: `66ac5f75df986fe638e7c49de32f4989df92e314` on `dashboard-status-polish`.

## Review finding

PR #76 review found a real reboot/recovery defect in the Time + Pulse runtime. When Shelly booted before its wall clock was trustworthy, the runtime correctly forced the relay OFF and exposed automation fault `tm`, but it never retried the clock gate. After time synchronization the stale `tm` fault therefore remained latched and later `rq(true)` requests continued to return `-1` until a restart or external recovery action.

## Accepted fix

The Time + Pulse gate remains fail-safe while the clock is untrusted:

- relay output is forced OFF;
- only the clock fault `tm` may be installed/retained by this path;
- a one-shot 30 s retry rechecks Shelly wall-clock trust;
- when the clock becomes trustworthy, only `tm` is cleared and the current daily window is reevaluated;
- any unrelated protection/relay fault remains authoritative and is never cleared by clock recovery.

No scheduler was moved into React and Steady Time remains the native Shelly Schedule contract.

## Deterministic verification

`packages/script-generator/src/__tests__/time-pulse-runtime.test.ts` passes **14/14** cases, including:

- untrusted clock => safe OFF + retry scheduled + active request rejected;
- later trusted clock => automatic recovery and current-window request resumes;
- protection fault present during clock recovery => relay remains OFF and the protection fault is preserved.

The exact code candidate passed script-generator typecheck, repository/UX gates and the full repository `pnpm check`. GitHub CI on the same candidate completed successfully. A previously intermittent, unrelated Hardware Setup toast test was rerun explicitly and passed before the final full gate.

## Real-device requalification

Device: configured Shelly Plug S Gen3 `shellyplugsg3-e4b063d7f530`.

The Plug's existing production runtime was first fingerprinted read-only. It was a completed Standalone Pulse runtime, script 1, source hash `lcl-87002b6d`, with terminal runtime state `[4,4,2,63084672,null,false,null,false,"pc"]`, no automation fault, relay OFF and an empty native schedule set. Because that state was terminal and stable, the production script was left running and was never stopped or restarted.

A temporary Time + Pulse runtime generated from the exact candidate was installed in a separate script slot only for the smoke test:

- generated source: **2164 B**;
- reported `mem_used=1386`, `mem_free=22302`;
- boot outside its synthetic active window remained safe OFF;
- a direct active request produced observable physical ON and OFF Pulse transitions;
- `rq(false)` cancelled the cycle and the relay remained OFF through the post-cancel observation window.

Cleanup removed the temporary script and explicitly forced/verified relay OFF. Postflight verified:

- production script source hash unchanged: `lcl-87002b6d`;
- production runtime state byte-for-byte unchanged from the preflight terminal state;
- native schedules unchanged and empty;
- exactly the original production script remained running;
- final physical relay state OFF.

A second known Plug (`shellyplugsg3-e4b063e3e298`) was not reachable by mDNS or its previously documented LAN address, so no mutation was attempted on that device.

## Acceptance

The PR #76 blocker is closed. Time + Pulse now recovers automatically from boot-time clock unavailability without weakening fail-safe OFF or clearing unrelated protection faults. The Pulse V1 working line is qualified for merge subject to the final repository gate on the documentation-complete head.
