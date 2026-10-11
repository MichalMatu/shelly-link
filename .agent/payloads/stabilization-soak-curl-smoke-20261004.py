import json
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

BASE_URL = "http://shellyplugsg3-e4b063d7f530.local"
EXPECTED_ID = "shellyplugsg3-e4b063d7f530"
SCRIPT_ID = 1
SAMPLES = 12
INTERVAL_SEC = 5
OUT = Path("/tmp/stabilization-soak-curl-20261004.jsonl")


def now_iso():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def curl_json(path):
    proc = subprocess.run(
        [
            "curl",
            "-fsS",
            "--retry",
            "2",
            "--retry-all-errors",
            "--connect-timeout",
            "3",
            "--max-time",
            "5",
            f"{BASE_URL}{path}",
        ],
        text=True,
        capture_output=True,
        timeout=20,
    )
    if proc.returncode != 0:
        return {"ok": False, "error": proc.stderr.strip() or f"curl exit {proc.returncode}"}
    try:
        return {"ok": True, "value": json.loads(proc.stdout)}
    except json.JSONDecodeError as exc:
        return {"ok": False, "error": f"invalid JSON: {exc}"}


def require_ok(result, label):
    if not result.get("ok"):
        raise RuntimeError(f"{label}: {result.get('error')}")
    return result["value"]


def preflight():
    info = require_ok(curl_json("/rpc/Shelly.GetDeviceInfo"), "Shelly.GetDeviceInfo")
    if str(info.get("id", "")).strip().lower() != EXPECTED_ID:
        raise RuntimeError(f"Unexpected Shelly identity: {info.get('id')}")
    relay = require_ok(curl_json("/rpc/Switch.GetStatus?id=0"), "Switch.GetStatus")
    if relay.get("output") is not False:
        raise RuntimeError("Read-only soak requires relay OFF before start")
    script = require_ok(curl_json(f"/rpc/Script.GetStatus?id={SCRIPT_ID}"), "Script.GetStatus")
    if script.get("running") is not True:
        raise RuntimeError("Production script must be running before soak")
    return info


def get_nested(record, *keys):
    current = record
    for key in keys:
        if not isinstance(current, dict):
            return None
        current = current.get(key)
    return current


info_before = preflight()
OUT.write_text("", encoding="utf-8")
mem_free_values = []
mem_used_values = []
mem_peak_values = []
start_monotonic = time.monotonic()

for index in range(SAMPLES):
    sampled_at = now_iso()
    responses = {
        "deviceInfo": curl_json("/rpc/Shelly.GetDeviceInfo"),
        "shellyStatus": curl_json("/rpc/Shelly.GetStatus"),
        "scriptStatus": curl_json(f"/rpc/Script.GetStatus?id={SCRIPT_ID}"),
        "switchStatus": curl_json("/rpc/Switch.GetStatus?id=0"),
        "diag": curl_json(f"/script/{SCRIPT_ID}/diag"),
    }
    sample_ok = all(result.get("ok") is True for result in responses.values())
    shelly_status = responses["shellyStatus"].get("value", {}) if responses["shellyStatus"].get("ok") else {}
    script_status = responses["scriptStatus"].get("value", {}) if responses["scriptStatus"].get("ok") else {}
    uptime = get_nested(shelly_status, "sys", "uptime")
    running = script_status.get("running") if isinstance(script_status, dict) else None
    if isinstance(script_status, dict):
        for key, target in (("mem_free", mem_free_values), ("mem_used", mem_used_values), ("mem_peak", mem_peak_values)):
            value = script_status.get(key)
            if isinstance(value, (int, float)):
                target.append(value)
    record = {
        "type": "sample",
        "schemaVersion": 1,
        "sequence": index + 1,
        "sampledAt": sampled_at,
        "elapsedMs": round((time.monotonic() - start_monotonic) * 1000),
        "ok": sample_ok,
        "parsed": {
            "device": {"uptimeSec": uptime},
            "script": {"id": SCRIPT_ID, "running": running},
        },
        "responses": responses,
    }
    with OUT.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record, separators=(",", ":")) + "\n")
    print(f"sample {index + 1}/{SAMPLES}: ok={sample_ok} uptime={uptime} running={running}")
    if index + 1 < SAMPLES:
        time.sleep(INTERVAL_SEC)

finished_at = now_iso()
with OUT.open("a", encoding="utf-8") as handle:
    handle.write(json.dumps({"type": "summary", "schemaVersion": 1, "finishedAt": finished_at}) + "\n")

report_proc = subprocess.run(
    ["pnpm", "exec", "tsx", "scripts/hardware/shelly-soak-liveness-report.ts", str(OUT)],
    text=True,
    capture_output=True,
    timeout=120,
)
if report_proc.returncode != 0:
    sys.stderr.write(report_proc.stderr)
    raise RuntimeError("soak liveness reporter failed")
report = json.loads(report_proc.stdout)
liveness = report["liveness"]

for key in (
    "deviceReboots",
    "maxEndpointOutageMs",
    "maxDiagOutageMs",
    "maxScriptNotRunningMs",
    "maxConsecutiveFailedSamples",
    "maxConsecutiveScriptNotRunningSamples",
    "scriptNotRunningSamples",
):
    if liveness.get(key) != 0:
        raise RuntimeError(f"Unexpected liveness finding {key}={liveness.get(key)}")

if report.get("samples") != SAMPLES:
    raise RuntimeError(f"Expected {SAMPLES} samples, got {report.get('samples')}")

info_after = require_ok(curl_json("/rpc/Shelly.GetDeviceInfo"), "final Shelly.GetDeviceInfo")
if str(info_after.get("id", "")).strip().lower() != EXPECTED_ID:
    raise RuntimeError("Shelly identity changed after soak")
relay_after = require_ok(curl_json("/rpc/Switch.GetStatus?id=0"), "final Switch.GetStatus")
script_after = require_ok(curl_json(f"/rpc/Script.GetStatus?id={SCRIPT_ID}"), "final Script.GetStatus")
if relay_after.get("output") is not False:
    raise RuntimeError("Relay is not OFF after read-only soak")
if script_after.get("running") is not True:
    raise RuntimeError("Production script is not running after read-only soak")
if not mem_free_values or min(mem_free_values) <= 0:
    raise RuntimeError("Missing positive mem_free evidence")

print(json.dumps({
    "deviceId": info_after.get("id"),
    "firmwareId": info_after.get("fw_id") or info_after.get("ver"),
    "samples": report.get("samples"),
    "durationSecApprox": (SAMPLES - 1) * INTERVAL_SEC,
    "liveness": liveness,
    "memUsedMax": max(mem_used_values) if mem_used_values else None,
    "memPeakMax": max(mem_peak_values) if mem_peak_values else None,
    "memFreeMin": min(mem_free_values),
    "finalRelayOn": relay_after.get("output"),
    "scriptRunningAfter": script_after.get("running"),
}, indent=2))

OUT.unlink(missing_ok=True)
