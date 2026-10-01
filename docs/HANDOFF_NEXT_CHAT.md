# Handoff — Pulse V1 next slice

Status: **2026-10-01 — History stacked panels are accepted and the canonical responsive baseline is healthy. The next product slice is Pulse V1.**

Repository: `MichalMatu/shelly-link`

## Start here

1. Fetch fresh `main` and `agent-control`.
2. Read `AGENTS.md`, this file, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/PERFORMANCE_HANDOFF.md` and `docs/UX_VISUAL_CONTRACT.md`.
3. Read fresh `agent-control:.agent/status/daemon.json`; never reuse an old conversation binding.
4. Confirm there is no active Local Agent task and no open PR before starting work.
5. Start from the accepted History/runtime/safety baseline. Do not reopen History KVS/`HistoryRecord[]` without concrete evidence of a data-model limitation.
6. Run the Pulse architecture + runtime-size gate before adding generated runtime behavior. Keep 9500 B as the preferred target; if the final supported Pulse + active-window worst case exceeds it, the user explicitly accepts a one-time guard increase to 10000 B after focused generator and real-Plug validation. Do not remove working safety/recovery behavior merely to stay below 9500 B.

Durable remote branches after closeout should remain only:

- `main` — development source of truth;
- `agent-control` — Local Agent control plane;
- `golden/climate-ui-20260928` — frozen visual recovery/reference branch.

## Accepted History baseline

History remains one read-only presentation over the existing Climate History v2 foundation:

- History v2 runs inside the single managed Climate runtime and stores records in the namespaced/versioned `shellylink.history.*` KVS ring;
- the mobile read path and `HistoryRecord[]` contract are unchanged;
- History writes remain observational and failure-isolated from relay/safety arbitration;
- loading, retry, empty and partial-corruption handling remain explicit;
- no History presentation component owns Shelly transport, BLE, KVS or durable storage side effects.

The accepted chart UX has five compact vertical panels in this order: Temperature, Humidity, Output, Power and Current. Each continuous metric has an independent real-unit Y scale. Output is a square digital step track. All panels share the same truthful time domain. There is no interactive legend, tooltip or crosshair in the accepted phone design. VPD remains in the typed History/scaling layer but is intentionally omitted from the five-panel stack.

The previously stale History responsive contract is now closed: the Current assertion matches the encoded fixture (`currentMilliA=200` -> `0,2 A` in Polish locale), the canonical Darwin `23-climate-history` snapshot was deliberately refreshed, final `pnpm check` passed, and the full responsive suite passed 36/36 on the accepted baseline. Treat that harness debt as resolved rather than reopening the old snapshot workaround.

## Next slice — Pulse V1

Pulse is no longer merely a parked primitive. The existing pure `RelayPulseAction` / one-shot pulse state machine remains a foundation. A shared bounded Pulse-cycle model now defines ON/OFF phases, initial delay, Continuous/Cycles/Duration execution, start phase and safe-OFF completion. Climate config can carry optional Pulse and daily active-window execution without changing the old config shape when those features are unused. Generated Shelly runtime integration and UI are still the next implementation work.

### Product shape

Automation setup should expose four primary automation types:

1. Temperature;
2. Humidity;
3. Time;
4. Pulse.

Temperature, Humidity and Time also gain an output behavior choice:

- **Steady** — existing normal relay behavior;
- **Pulse** — while the parent automation requests active output, execute the shared Pulse cycle.

Temperature and Humidity additionally gain an optional daily active window, including windows that cross midnight. Outside the window AUTO is inactive/safe OFF. Existing steady Time remains the native Shelly schedule contract; do not overload its current `DailyTimeAutomationConfig` semantics. Time + Pulse should compose the existing daily window with the shared Pulse engine through an explicit runtime model.

Standalone Pulse uses exactly the same pulse engine/configuration without a climate parent condition.

Do not build separate temperature-pulse, humidity-pulse and time-pulse runtimes. There must be one shared Pulse state/config model with adapters/composition at the automation layer.

### Pulse V1 configuration

V1 scope is deliberately useful but bounded:

- ON time in seconds;
- OFF time in seconds;
- Continuous mode;
- fixed Cycles mode;
- bounded total Duration mode;
- optional initial delay;
- selectable start phase (ON/OFF), with ON as the simple default;
- safe OFF end state after completion/cancellation;
- one-shot Pulse retained as the simple/degenerate form of the same foundation;
- validation and explicit bounds for time/count inputs.

The Pulse controls should follow the compact optional-control pattern already used by VPD: collapsed while disabled, expanded parameters when enabled. Standalone Pulse gets its own automation setup surface but reuses the same Pulse configuration component/model.

### Required semantics

- Pulse never becomes a second relay owner; one Plug relay still has one managed automation owner.
- Hard safety and forced-OFF paths cancel Pulse immediately and leave the relay OFF.
- Automation faults that require OFF cancel Pulse immediately.
- Temperature/Humidity parent condition becoming inactive cancels immediately rather than finishing a cycle.
- Time + Pulse cycles only inside the active Time window; the window closing cancels immediately and leaves OFF.
- MANUAL relay control suspends/cancels Pulse; returning to AUTO starts a fresh cycle from the configured start phase if the parent condition is active.
- Reboot/power-cycle starts safe OFF; never resume an unknown in-flight timer. Re-evaluate the parent condition and start a fresh cycle only after runtime state is rebuilt.
- Existing minimum ON/OFF, debounce and cooldown ownership must compose with Pulse rather than being duplicated.
- History/status must be able to explain Pulse-driven transitions; React may display phase/progress but must not own timers.

### Acceptance before moving on

Pulse V1 is not complete until Temperature + Pulse, Humidity + Pulse, Time + Pulse and standalone Pulse are covered across Continuous/Cycles/Duration, safety/fault/MANUAL/reboot interactions are tested, runtime byte headroom is re-audited, the final repository gate is green, responsive/visual UI evidence exists and real Plug acceptance ends with relay explicitly verified OFF.

## Sequence after Pulse V1

Once Pulse V1 is qualified and stable, resume the existing V1 roadmap rather than immediately expanding every Pulse idea:

1. Dashboard status polish — make requested output, final relay output, reason, automation fault, hard safety and Pulse phase understandable at a glance;
2. UX redesign round 2 — make the product more status-first while keeping transport/script/firmware diagnostics under Device / Info / Advanced;
3. Watchdog/stabilization — heartbeat/watchdog, reboot/power-cycle recovery, Wi-Fi/BLE loss, AUTO/MANUAL matrix, fault/safety recovery, Pulse cancellation/recovery, soak, memory headroom, final hardware matrix and UX acceptance;
4. v1 feature freeze.

After V1 stabilization/freeze, return to Pulse as the first growth track. `docs/ROADMAP.md` preserves the Advanced backlog: Burst mode, Adaptive Pulse, active-window convenience, phase reset/resume policy, optional completion behavior beyond safe OFF only if justified, accumulated ON/duty budgets and richer cycle diagnostics. Those ideas must not enlarge Pulse V1 or bypass runtime-size/safety gates.

## Performance rule

`docs/PERFORMANCE_HANDOFF.md` is the source of truth for Local Agent performance work. Do not infer a host migration from personal hardware ownership; verify the active host before resuming any performance/concurrency/cache campaign. Run only one heavy build/test workload at a time.

## Verification rule

Use the normal repository loop: architecture/UX gate -> smallest cohesive implementation -> focused checks -> responsive/visual evidence when geometry changes -> real-device evidence when relevant -> exactly one final full `pnpm check` on the exact merged `main` -> cleanup temporary branches/artifacts. If real Shelly runtime is touched, use identity-first access and finish with explicitly verified relay OFF.
