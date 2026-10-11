#!/usr/bin/env python3
import json
import os
import subprocess
import sys
import time

BASE = "http://192.168.0.17"
EXPECT = "shellyplugsg3-e4b063e3e298"
XIAOMI = "A4:C1:38:4F:24:CD"
TP357 = "F7:5F:8D:0F:76:20"

def rpc(method, params=None, timeout=10):
    cmd = ["curl", "-sS", "--connect-timeout", "2", "--max-time", str(timeout)]
    if params is not None:
        cmd += ["-X", "POST", "-H", "Content-Type: application/json", "--data", json.dumps(params)]
    cmd.append(BASE + "/rpc/" + method)
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode:
        raise RuntimeError(proc.stderr.strip())
    value = json.loads(proc.stdout)
    if isinstance(value, dict) and "code" in value and "message" in value:
        raise RuntimeError(str(value))
    return value

def cleanup():
    for script in rpc("Script.List").get("scripts", []):
        sid = script.get("id")
        if isinstance(sid, int):
            try:
                rpc("Script.Stop", {"id": sid})
            except Exception:
                pass
            rpc("Script.Delete", {"id": sid})
    rpc("Switch.Set", {"id": 0, "on": False})
    time.sleep(2)
    final = {
        "scripts": rpc("Script.List"),
        "schedules": rpc("Schedule.List"),
        "switch": rpc("Switch.GetStatus", {"id": 0}),
        "wifi": rpc("Wifi.GetStatus"),
        "matter": rpc("Matter.GetConfig"),
    }
    assert final["scripts"].get("scripts") == [], final
    assert final["schedules"].get("jobs") == [], final
    assert final["switch"].get("output") is False, final
    assert final["wifi"].get("status") == "got ip", final
    assert final["matter"].get("enable") is False, final
    print(json.dumps({"cleanup": "PASS", "final": final}, indent=2, sort_keys=True))

sensor = sys.argv[1]
if sensor not in {"xiaomi", "tp357"}:
    raise SystemExit("sensor must be xiaomi or tp357")

cleanup()
env = os.environ.copy()
env.update({
    "SHELLY_URL": BASE,
    "XIAOMI_MAC": XIAOMI,
    "TP357_MAC": TP357,
    "SENSOR_FILTER": sensor,
    "VPD_OPTIONS": "both",
    "PHASE_TIMEOUT_MS": "60000",
    "POLL_MS": "1500",
    "RPC_TIMEOUT_MS": "20000",
})
try:
    result = subprocess.run(["pnpm", "hardware:shelly:matrix"], env=env)
    code = result.returncode
finally:
    cleanup()
raise SystemExit(code)
