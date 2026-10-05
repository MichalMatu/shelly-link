# BLE scanner stop/restart re-subscription acceptance — 2026-10-05

Result: **PASS — PR #91 fix is hardware-qualified and merged.**

## Scope

This acceptance isolates the remaining stopped-scanner recovery question after PR #89.

PR #89 already established that ordinary sensor silence must not restart a healthy BLE scanner. This gate tests a different condition: the Shelly scanner itself is explicitly stopped while the managed Climate script remains alive, then the watchdog is allowed to restart it.

The question was whether `BLE.Scanner.start()` alone restores event delivery, or whether a fresh `BLE.Scanner.subscribe(...)` is required after `BLE.Scanner.stop()` on the real Plug S Gen3 firmware.

## Hardware / baseline

- repository: `MichalMatu/shelly-link`
- physical controller: Shelly Plug S Gen3
- device id: `shellyplugsg3-e4b063d7f530`
- model: `S3PL-00112EU`
- firmware: `1.7.5`
- managed Climate script: script id 1
- baseline product `main` used for the failing A/B half: `970ba813dde5c597a02196a1733e1e022d38fec1`
- PR #91 head: `7b8b317c3cffc86695cfb1276ba8a2ea63f9d3ea`
- merge commit: `50fc9f083f013a0652d44011da6a6eff534fab9d`
- fresh PR CI: run #659, canonical repository gate + responsive smoke PASS

The test used the existing HTTP `Script.Eval` path against the configured Plug. Physical device identity was checked before mutation.

## A/B method

The same runtime markers were sampled in both halves:

- `BLE.Scanner.isRunning()` — scanner liveness;
- `R.sa` — scanner start-attempt marker;
- `R.l` — last accepted target BLE frame marker;
- `Script.GetStatus` — script liveness/errors;
- `Switch.GetStatus` — physical relay state.

The scanner was stopped with the firmware API through `Script.Eval`. The watchdog was then given up to 75 s to restart scanning and receive a new target frame.

A recovery counted only if all of the following were true:

1. scanner liveness changed to `false` after the explicit stop;
2. watchdog later made scanner liveness `true` again;
3. `R.sa` advanced, proving a new scanner start attempt;
4. `R.l` advanced beyond the pre-stop value, proving actual target event delivery returned;
5. the managed script remained running without reported errors.

Scanner liveness alone was not accepted as recovery.

## Current `main` failure

On unmodified `main` before PR #91:

- pre-stop `R.sa = 31331818`;
- pre-stop `R.l = 139017287`;
- after explicit stop, `BLE.Scanner.isRunning()` became `false`;
- the watchdog later restarted scanning;
- `R.sa` advanced to `139030849`;
- `BLE.Scanner.isRunning()` returned `true`;
- `R.l` remained exactly `139017287` for the complete 75 s observation window;
- the script stayed running with no reported error.

Therefore the real device proved the failure mode: **the scanner restarts, but the prior scan callback no longer receives target frames.**

This falsified the assumption that `BLE.Scanner.stop()` / `start()` preserves usable event delivery on this firmware.

## PR #91 candidate result

The installed production source was first read back and fingerprinted. A candidate was constructed by changing only the stopped-scanner watchdog path from:

```js
function bw() {
  if (br() === false) bs();
}
```

(or its compact boolean alias) to the equivalent of:

```js
function bw() {
  if (br() === false) {
    BLE.Scanner.subscribe(function (e, x) {
      ev(e, x);
    });
    bs();
  }
}
```

Candidate runtime:

- bytes: `8962`
- SHA-256: `80aa315eaf88c2b977b2d92c388d5a85d50b5d331f78ccd05726e21799d9f37e`

Two consecutive physical stop/restart cycles passed.

### Cycle 1

- scanner start marker: `139276637 -> 139305669`
- target frame marker: `139277550 -> 139308684`
- scanner returned running;
- fresh configured target frame was accepted;
- script remained healthy.

### Cycle 2

- scanner start marker: `139305669 -> 139335670`
- target frame marker: `139308684 -> 139338674`
- scanner returned running;
- fresh configured target frame was accepted again;
- script remained healthy.

The repeated second cycle is important: it shows the watchdog re-subscription path is not a one-shot recovery artifact.

## Restore / safety proof

The hardware A/B did not leave the temporary candidate installed.

The original production runtime was restored byte-for-byte after the gate:

- original bytes: `8914`
- original SHA-256: `46446a0405aa310979fd65d0d4a3fff4479b8efba2b799d8528e264a13ceb0ef`
- restored bytes: `8914`
- restored SHA-256: `46446a0405aa310979fd65d0d4a3fff4479b8efba2b799d8528e264a13ceb0ef`
- readback byte equality: true
- restored managed script: running healthy
- final relay: OFF
- final power/current: `0.0 W / 0.0 A`

## Software verification

An equivalent local rebase of the #91 change onto then-current `main` passed:

- focused `@lcl/script-generator` tests: 2 files / 31 tests;
- `@lcl/script-generator` typecheck;
- `pnpm quality:repo`;
- quality gate self-test: 20 cases;
- `git diff --check`;
- full `pnpm check`.

Fresh GitHub PR CI #659 then passed on head `7b8b317c3cffc86695cfb1276ba8a2ea63f9d3ea` against base `970ba813dde5c597a02196a1733e1e022d38fec1`:

- canonical repository gate: PASS;
- Playwright Chromium setup: PASS;
- responsive smoke: PASS;
- responsive visual audit upload: PASS.

PR #91 was merged as `50fc9f083f013a0652d44011da6a6eff534fab9d`.

## Accepted conclusion

For the qualified Plug S Gen3 / firmware 1.7.5 runtime, a watchdog recovery from an actually stopped BLE scanner must establish a fresh scanner subscription before restarting the scanner.

This acceptance is specific to the **scanner stopped -> watchdog restart -> event delivery** path. It does not replace the separate PR #89 sensor-silence acceptance, where a healthy running scanner must not be restarted merely because no configured target frame is accepted.
