#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HUMIDIFIER_URL="${HUMIDIFIER_URL:?Set HUMIDIFIER_URL, e.g. http://192.168.0.10}"
FAN_URL="${FAN_URL:?Set FAN_URL, e.g. http://192.168.0.17}"
HUMIDIFIER_DEVICE_ID="${HUMIDIFIER_DEVICE_ID:?Set HUMIDIFIER_DEVICE_ID}"
FAN_DEVICE_ID="${FAN_DEVICE_ID:?Set FAN_DEVICE_ID}"
HUMIDIFIER_SCRIPT_ID="${HUMIDIFIER_SCRIPT_ID:-1}"
FAN_SCRIPT_ID="${FAN_SCRIPT_ID:-1}"
SOAK_DURATION_MS="${SOAK_DURATION_MS:-300000}"
SOAK_INTERVAL_MS="${SOAK_INTERVAL_MS:-5000}"
SOAK_RPC_TIMEOUT_MS="${SOAK_RPC_TIMEOUT_MS:-4000}"
HUMIDIFIER_CYCLE_PERIOD_MS="${HUMIDIFIER_CYCLE_PERIOD_MS:-90000}"
HUMIDIFIER_MAX_ON_MS="${HUMIDIFIER_MAX_ON_MS:-150000}"
RESTORE_HUMIDIFIER_RUNNING="${RESTORE_HUMIDIFIER_RUNNING:-1}"
RUN_ID="${RUN_ID:-$(date -u +%Y%m%dT%H%M%SZ)}"
OUT_DIR="${DUAL_SOAK_OUT_DIR:-$ROOT_DIR/artifacts/hardware/dual-soak-$RUN_ID}"
TSX_CLI="$ROOT_DIR/node_modules/tsx/dist/cli.mjs"
LOGGER="$ROOT_DIR/scripts/hardware/shelly-soak-logger.ts"

mkdir -p "$OUT_DIR"

json_get() {
  python3 -c 'import json,sys; data=json.load(sys.stdin); cur=data
for part in sys.argv[1].split("."):
    cur=cur[int(part)] if isinstance(cur,list) else cur[part]
print("true" if cur is True else "false" if cur is False else cur)' "$1"
}

rpc_get() {
  local base="$1" path="$2"
  curl -fsS --max-time 6 "${base%/}${path}"
}

verify_identity() {
  local label="$1" base="$2" expected="$3" actual
  actual="$(rpc_get "$base" '/rpc/Shelly.GetDeviceInfo' | json_get id)"
  if [[ "${actual,,}" != "${expected,,}" ]]; then
    echo "$label identity mismatch: expected=$expected actual=$actual" >&2
    exit 1
  fi
  echo "$label identity OK: $actual"
}

script_running() {
  rpc_get "$1" "/rpc/Script.GetStatus?id=$2" | json_get running
}

relay_on() {
  rpc_get "$1" '/rpc/Switch.GetStatus?id=0' | json_get output
}

stop_script() { rpc_get "$1" "/rpc/Script.Stop?id=$2" >/dev/null || true; }
start_script() { rpc_get "$1" "/rpc/Script.Start?id=$2" >/dev/null; }
force_off() { rpc_get "$1" '/rpc/Switch.Set?id=0&on=false' >/dev/null || true; }

verify_identity humidifier "$HUMIDIFIER_URL" "$HUMIDIFIER_DEVICE_ID"
verify_identity fan "$FAN_URL" "$FAN_DEVICE_ID"

hum_was_running="$(script_running "$HUMIDIFIER_URL" "$HUMIDIFIER_SCRIPT_ID")"
fan_was_running="$(script_running "$FAN_URL" "$FAN_SCRIPT_ID")"
if [[ "$hum_was_running" != true ]]; then
  echo "Humidifier managed script must already be running; got $hum_was_running" >&2
  exit 1
fi
if [[ "$fan_was_running" != false ]]; then
  echo "Fan Pulse script must start from stopped state; got $fan_was_running" >&2
  exit 1
fi

rpc_get "$HUMIDIFIER_URL" "/script/$HUMIDIFIER_SCRIPT_ID/diag" >/dev/null
fan_head="$(rpc_get "$FAN_URL" "/rpc/Script.GetCode?id=$FAN_SCRIPT_ID&offset=0&len=512")"
if [[ "$fan_head" != *"standalone-pulse-v1"* ]]; then
  echo "Fan script $FAN_SCRIPT_ID is not the expected Shelly Link standalone Pulse runtime" >&2
  exit 1
fi

echo "Preflight OK: humidifier Climate runtime running; fan standalone Pulse stopped."
echo "Artifacts: $OUT_DIR"

test_started=0
hum_pid=''
fan_pid=''
cleanup() {
  local rc=$?
  trap - EXIT INT TERM
  [[ -n "$hum_pid" ]] && kill -INT "$hum_pid" 2>/dev/null || true
  [[ -n "$fan_pid" ]] && kill -INT "$fan_pid" 2>/dev/null || true
  if [[ "$test_started" == 1 ]]; then
    stop_script "$HUMIDIFIER_URL" "$HUMIDIFIER_SCRIPT_ID"
    stop_script "$FAN_URL" "$FAN_SCRIPT_ID"
    force_off "$HUMIDIFIER_URL"
    force_off "$FAN_URL"
  fi
  if [[ $rc -eq 0 && "$RESTORE_HUMIDIFIER_RUNNING" == 1 && "$hum_was_running" == true ]]; then
    start_script "$HUMIDIFIER_URL" "$HUMIDIFIER_SCRIPT_ID"
    echo "Humidifier runtime restored to running after accepted OFF boundary."
  fi
  exit $rc
}
trap cleanup EXIT INT TERM

start_script "$FAN_URL" "$FAN_SCRIPT_ID"
test_started=1

(
  cd "$ROOT_DIR"
  env SHELLY_URL="$HUMIDIFIER_URL" SCRIPT_ID="$HUMIDIFIER_SCRIPT_ID" \
    SOAK_OUT_FILE="$OUT_DIR/humidifier.jsonl" \
    SOAK_SUMMARY_FILE="$OUT_DIR/humidifier.summary.md" \
    SOAK_INTERVAL_MS="$SOAK_INTERVAL_MS" SOAK_RPC_TIMEOUT_MS="$SOAK_RPC_TIMEOUT_MS" \
    SOAK_DURATION_MS="$SOAK_DURATION_MS" SOAK_REQUIRE_DIAG=1 \
    SOAK_CYCLE_RELAY=1 SOAK_CYCLE_PERIOD_MS="$HUMIDIFIER_CYCLE_PERIOD_MS" \
    SOAK_CYCLE_MIN_CHANGE_MS=1000 SOAK_CYCLE_MAX_ON_MS="$HUMIDIFIER_MAX_ON_MS" \
    SOAK_CYCLE_CONSECUTIVE_HITS=1 SOAK_FINAL_OFF=1 SOAK_STOP_SCRIPT_ON_FINISH=1 \
    "$(command -v node)" "$TSX_CLI" "$LOGGER"
) >"$OUT_DIR/humidifier.log" 2>"$OUT_DIR/humidifier.err.log" &
hum_pid=$!

(
  cd "$ROOT_DIR"
  env SHELLY_URL="$FAN_URL" SCRIPT_ID="$FAN_SCRIPT_ID" \
    SOAK_OUT_FILE="$OUT_DIR/fan.jsonl" \
    SOAK_SUMMARY_FILE="$OUT_DIR/fan.summary.md" \
    SOAK_INTERVAL_MS="$SOAK_INTERVAL_MS" SOAK_RPC_TIMEOUT_MS="$SOAK_RPC_TIMEOUT_MS" \
    SOAK_DURATION_MS="$SOAK_DURATION_MS" SOAK_REQUIRE_DIAG=0 \
    SOAK_CYCLE_RELAY=0 SOAK_FINAL_OFF=1 SOAK_STOP_SCRIPT_ON_FINISH=1 \
    "$(command -v node)" "$TSX_CLI" "$LOGGER"
) >"$OUT_DIR/fan.log" 2>"$OUT_DIR/fan.err.log" &
fan_pid=$!

set +e
wait "$hum_pid"; hum_rc=$?
wait "$fan_pid"; fan_rc=$?
set -e
hum_pid=''; fan_pid=''
if [[ $hum_rc -ne 0 || $fan_rc -ne 0 ]]; then
  echo "Logger failure: humidifier=$hum_rc fan=$fan_rc" >&2
  exit 1
fi

node - "$OUT_DIR/humidifier.jsonl" "$OUT_DIR/fan.jsonl" <<'NODE'
const fs = require('fs');
function summary(path) {
  const lines = fs.readFileSync(path, 'utf8').trim().split(/\n/).filter(Boolean);
  const row = [...lines].reverse().map(JSON.parse).find((entry) => entry.type === 'summary');
  if (!row) throw new Error(`Missing summary in ${path}`);
  return row.summary;
}
function requireOk(label, value, sensorRequired) {
  const failures = [];
  if (value.samples < 20) failures.push(`samples=${value.samples}`);
  if (value.failedSamples !== 0) failures.push(`failedSamples=${value.failedSamples}`);
  if (value.scriptNotRunningSamples !== 0) failures.push(`scriptNotRunning=${value.scriptNotRunningSamples}`);
  if (value.cycleErrors !== 0) failures.push(`cycleErrors=${value.cycleErrors}`);
  if (value.cycleFinalOffOk !== true) failures.push(`finalOff=${value.cycleFinalOffOk}`);
  if (value.cycleScriptStopOk !== true) failures.push(`scriptStop=${value.cycleScriptStopOk}`);
  if (value.relayChanges < 2) failures.push(`relayChanges=${value.relayChanges}`);
  if (sensorRequired && value.samplesWithMeasurement < 1) failures.push('no climate measurement');
  if (failures.length) throw new Error(`${label} smoke failed: ${failures.join(', ')}`);
  console.log(`${label}: samples=${value.samples} relayChanges=${value.relayChanges} failed=0 finalOff=true`);
}
requireOk('humidifier', summary(process.argv[2]), true);
requireOk('fan', summary(process.argv[3]), false);
NODE

if [[ "$(relay_on "$HUMIDIFIER_URL")" != false || "$(relay_on "$FAN_URL")" != false ]]; then
  echo "Postflight expected both relays OFF before restoration" >&2
  exit 1
fi
if [[ "$(script_running "$HUMIDIFIER_URL" "$HUMIDIFIER_SCRIPT_ID")" != false ]]; then
  echo "Humidifier script was not stopped at OFF boundary" >&2
  exit 1
fi
if [[ "$(script_running "$FAN_URL" "$FAN_SCRIPT_ID")" != false ]]; then
  echo "Fan Pulse script was not stopped at OFF boundary" >&2
  exit 1
fi

echo "Dual soak accepted OFF boundary: both relays OFF, both test runtimes stopped."
