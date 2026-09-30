# Climate relay debounce hardware acceptance — 2026-09-30

Candidate: `878a12f09cdf769b5b86ac07a324306710ee5e56`

Device: configured Shelly Plug S Gen3 `shellyplugsg3-e4b063d7f530`, model `S3PL-00112EU`, firmware 1.7.5.

## Preflight

- exactly one production script was present and running: `Shelly Link Thermostat` (script 1);
- production source SHA-256 was `37ce58a4c759499d712922e2051cc7167b8fb31a0b2171bcdd6193df5d20889e`;
- control state was MANUAL with manual request OFF, no automation fault and no safety lockout;
- `Schedule.List` was empty;
- all 9 existing `shellylink.history.*` KVS items were backed up;
- physical relay was OFF at 0 W / 0 A.

## Candidate runtime

A temporary generator 0.6.3 runtime was installed from the exact candidate head. It was 9198 B and reported `mem_used=5222`, `mem_free=17164`.

The real-device acceptance exercised the runtime relay arbiter directly while preserving the production runtime:

- an ON request entered debounce (`db=true`, reason `db`) while the physical relay remained OFF;
- cancelling that request before maturity cleared debounce state and the old timer did not energize the relay;
- a stable ON request matured from the one-shot timer without another measurement and physically switched the relay ON;
- a stable OFF request likewise matured from its one-shot timer and physically switched the relay OFF;
- after re-energizing the relay, an OFF request remained pending under debounce;
- entering MANUAL forced the relay OFF immediately, cleared the pending debounce state, and the invalidated timer did not change the relay later.

## Cleanup and final state

The temporary runtime was removed. The acceptance report verified that production source, schedules and History KVS were restored, control returned to MANUAL/OFF without safety lockout, and the final relay was OFF at 0 W / 0 A. A separate read-only postflight over the stable LAN IP independently confirmed the single production script running with the original SHA-256, empty schedules, MANUAL/OFF state, no lockout, all 9 History keys present, and relay OFF at 0 W / 0 A.

One Local Agent wrapper recorded the acceptance command as failed only because its final `git status` assertion ran before the shell `EXIT` trap deleted the temporary harness file. The harness itself completed and printed the full successful acceptance/cleanup report; the repository worktree was clean after the trap. Earlier `.local` retries also encountered transient RPC timeouts, so the successful acceptance used the stable LAN IP. These transport/harness failures are not product failures.
