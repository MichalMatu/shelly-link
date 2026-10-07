# Checkpoint — pre-soak V1 freeze

Date: 2026-10-07
Repository: `MichalMatu/shelly-link`
Canonical main: `e85d334416e48068ebfb19853a92c1d2139aaedf`

This is the resume point before the final 8-hour V1 soak.

## Repository state

- `main` is clean.
- No open pull requests.
- Remote branches intentionally left: `main`, `agent-control`.
- No soak/logger process is running in the Local Agent workspace.
- The dual-soak harness and 5-minute real-load qualification are already merged to `main`.
- Do not start Core 2 work before the 8-hour soak and V1 freeze sign-off are complete.

## Physical setup

### Humidifier Plug

- locator: `http://192.168.0.10`
- canonical id: `shellyplugsg3-e4b063d7f530`
- model: `S3PL-00112EU`
- firmware: `1.7.5`
- script id: `1`
- managed Climate runtime: running
- relay at checkpoint: OFF
- observed device temperature at checkpoint: 41.1 C

### Fan Plug

- locator: `http://192.168.0.17`
- canonical id: `shellyplugsg3-e4b063e3e298`
- model: `S3PL-00112EU`
- firmware: `2.0.1`
- script id: `1`
- existing source was decoded as Shelly Link Standalone Pulse, 60 s ON / 100 s OFF, continuous
- script at checkpoint: stopped
- relay at checkpoint: OFF
- observed device temperature at checkpoint: 41.1 C
- Script.List still carries the older display name `Shelly Link Thermostat`; do not rename or replace it before the soak merely for cosmetic cleanup.

IP addresses are transport locators only. Always verify the canonical device id before mutating either Plug.

## Qualified 5-minute preflight

The two-Plug real-load smoke passed:

- humidifier: 52/52 samples OK, 0 RPC/diag failures, 3 relay transitions, load observed up to 12.9 W;
- fan: 57/57 samples OK, 0 RPC failures, 3 relay transitions, load observed up to 4.6 W;
- both accepted an explicit OFF boundary;
- humidifier Climate runtime was restored to running;
- fan Pulse runtime was restored to stopped.

Detailed evidence:
`docs/testing/dual-soak-smoke-acceptance-2026-10-07.md`

## Next action — final 8-hour soak

Run from fresh `main` with the current physical setup unchanged:

```bash
HUMIDIFIER_URL=http://192.168.0.10 \
FAN_URL=http://192.168.0.17 \
HUMIDIFIER_DEVICE_ID=shellyplugsg3-e4b063d7f530 \
FAN_DEVICE_ID=shellyplugsg3-e4b063e3e298 \
make shelly-dual-soak-overnight
```

The overnight profile is already prepared:

- duration: 8 hours;
- sampling: 5 seconds;
- humidifier Climate threshold phase change: every 10 minutes;
- humidifier test max-ON guard: 11 minutes;
- fan: existing 60 s ON / 100 s OFF Standalone Pulse;
- separate logs and summaries;
- both devices must reach the explicit final OFF boundary.

The computer running the harness must remain on and connected to the same LAN for the full test.

## Acceptance after the 8-hour run

Do not declare V1 frozen until all of the following are checked:

- both identities still match the canonical ids above;
- no unexpected Shelly reboot;
- no sustained RPC/diag outage;
- no unexpected stopped-runtime sample during the test;
- Climate BLE measurements remain live;
- relay transitions are present on both real loads;
- no unexplained memory degradation;
- both relays finish OFF;
- humidifier runtime restoration is verified;
- fan runtime returns to its preflight stopped state;
- summaries/evidence are saved under `docs/testing/`;
- final repository gates and freeze/release sign-off pass.

After that, declare Core 1 / V1 frozen and continue from `docs/DEVELOPMENT_PLAN.md` into Core 2.
