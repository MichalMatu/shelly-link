# Standalone Pulse safe inline replacement acceptance — 2026-10-04

## Scope

This acceptance closes the deferred Standalone Pulse inline edit/replacement lifecycle without reusing the destructive fresh-install path.

The accepted contract is:

- verify the physical Shelly identity before replacement;
- keep the installed relay id fixed during inline editing;
- preserve the existing Shelly script id;
- read and retain the exact previous script source, run-on-boot flag and running/paused state;
- compare the current source hash with the durable installed hash before the first mutation;
- on a hash mismatch, abort before `Script.Stop`, `Switch.Set` or `Script.PutCode`;
- for an accepted replacement, stop the old running script, force and confirm the managed relay OFF, upload the new source, restore the enable flag and previous running/paused state, then verify source/list/status evidence;
- if upload, start or post-upload verification fails after mutation begins, restore and verify the exact previous source, enable flag and running/paused state;
- update the durable app installation only after device-side replacement verification succeeds.

No `InstalledAutomation` schema migration is required. `installation.id`, `script.id` and `installedAtMs` remain stable; only config, script hash and `updatedAtMs` change after a successful replacement.

## Deterministic software evidence

The transactional Shelly replacement tests passed **6/6**, including:

- running-state preservation;
- paused-state preservation;
- stale-source compare-and-swap rejection before mutation;
- `Script.Stop -> confirmed relay OFF -> Script.PutCode` ordering;
- exact rollback after upload failure;
- exact rollback after post-upload `Script.GetStatus` verification failure.

Standalone Pulse lifecycle tests passed **10/10**, including physical identity rejection and same-installation/same-script replacement semantics.

Repository boundary, UX and type gates passed after the editor was kept behind the existing `features/automations` `Pulse` facade. The implementation/visual candidate through `1641864fb46d4da8cd9fa3b79ed6a1555f9c18dd` also passed canonical visual acceptance **7/7**. Exactly one intentional canonical PNG changed: `29-standalone-pulse-detail-darwin.png`, reflecting the new inline edit affordance.

## Real Plug S Gen3 acceptance

Target:

- Shelly Plug S Gen3 `shellyplugsg3-e4b063d7f530`;
- model `S3PL-00112EU`, Gen 3;
- firmware `1.7.5` / `20260311-095902/1.7.5-g9979d16`.

Preflight confirmed one production Climate script:

- script id `1`, `Shelly Link Thermostat`;
- enabled and running;
- source size `8847 B`;
- source SHA-256 `eaa12322ffe9d8777df08706264b039294ecc515df9795f63da49ecb0f8a53c6`;
- no native schedules;
- initial relay OFF.

The device was intentionally **not** converted from its live Climate automation to Standalone Pulse. Real-hardware qualification exercised the shared replacement primitive with the production script replaced by its own byte-identical source.

The stale expected-hash path rejected before mutation. The same-source replacement then preserved script id, source bytes, enable state and running state and confirmed relay OFF during the transaction. A later redundant final source re-read hit a transient host-side fetch failure after those in-transaction assertions had passed.

An immediate independent recovery read verified that the production script still had the same id, size, enabled/running state and byte-identical SHA-256. Because the restored Climate runtime was in AUTO, it subsequently reasserted its legitimate automation request and turned the relay ON; therefore a raw `Switch.Set OFF` is not a valid stable cleanup for a running Climate runtime.

Cleanup used the existing qualified Climate runtime control API instead of another script upload. Production control was set to **MANUAL/OFF**, then independently verified as:

- `mode=manual`;
- `manualRequestOn=false`;
- no automation fault;
- no safety lockout/reason;
- relay `output=false`;
- `0.0 W / 0.0 A`;
- one original script, id `1`, enabled and running;
- source SHA-256 still `eaa12322ffe9d8777df08706264b039294ecc515df9795f63da49ecb0f8a53c6`;
- zero schedules.

This real-device run qualifies the same-id transactional mutation primitive used by Standalone Pulse while preserving the configured production Climate runtime. Pulse-specific config generation, identity orchestration and durable-record update are covered by deterministic Pulse/runtime tests and the accepted UI flow rather than by replacing the live production Climate runtime with Pulse.
