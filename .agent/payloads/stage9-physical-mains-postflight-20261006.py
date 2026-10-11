import hashlib,json,subprocess,time
BASE="http://shellyplugsg3-e4b063d7f530.local"
EXPECTED_ID="shellyplugsg3-e4b063d7f530"
EXPECTED_SOURCE_SHA256="80aa315eaf88c2b977b2d92c388d5a85d50b5d331f78ccd05726e21799d9f37e"
EXPECTED_SOURCE_BYTES=8962
PRE_UPTIME=163508

def curl_once(path):
    p=subprocess.run(["curl","-sS","--connect-timeout","3","--max-time","6",BASE+path],capture_output=True,text=True)
    if p.returncode!=0:
        return False,p.stderr.strip()
    try:
        return True,json.loads(p.stdout)
    except Exception:
        return False,f"invalid JSON: {p.stdout[:200]}"

def get(path,attempts=8):
    last=None
    for i in range(attempts):
        ok,val=curl_once(path)
        if ok:
            return val
        last=val
        if i+1<attempts: time.sleep(1)
    raise RuntimeError(f"{path} failed: {last}")

def read_source(script_id):
    parts=[]; offset=0
    for _ in range(64):
        x=get(f"/rpc/Script.GetCode?id={script_id}&offset={offset}&len=1024")
        data=x.get("data"); left=x.get("left")
        if not isinstance(data,str) or not isinstance(left,(int,float)):
            raise RuntimeError(f"bad Script.GetCode response: {x!r}")
        parts.append(data)
        offset += len(data.encode("utf-8"))
        if left<=0: break
        if not data: raise RuntimeError("Script.GetCode made no progress")
    else:
        raise RuntimeError("Script.GetCode exceeded chunk limit")
    return "".join(parts)

def diag_state(diag):
    g=diag.get("g") if isinstance(diag,dict) else None
    p=diag.get("p") if isinstance(diag,dict) else None
    y=diag.get("y") if isinstance(diag,dict) else None
    if not isinstance(g,list) or len(g)<24:
        raise RuntimeError(f"invalid diag.g: {g!r}")
    return {
      "deviceUptimeSec": y[2] if isinstance(y,list) and len(y)>2 else None,
      "finalRelayOn": p[0] if isinstance(p,list) and p else None,
      "powerW": p[1] if isinstance(p,list) and len(p)>1 else None,
      "currentA": p[3] if isinstance(p,list) and len(p)>3 else None,
      "runtimeRelayOn": g[5],
      "reason": g[6],
      "dataState": g[16],
      "controlMode": "manual" if g[17] else "auto",
      "automationRequestOn": g[18],
      "manualRequestOn": g[20],
      "automationFault": g[21],
      "safetyLockout": g[22],
      "safetyReason": g[23],
      "temperatureC": g[1],
      "humidityPct": g[2],
      "lastMeasurementUptimeMs": g[0]
    }

info=get("/rpc/Shelly.GetDeviceInfo")
if info.get("id")!=EXPECTED_ID:
    raise RuntimeError(f"identity mismatch: {info!r}")

scripts=get("/rpc/Script.List")
entries=scripts.get("scripts") if isinstance(scripts,dict) else None
if not isinstance(entries,list) or len(entries)!=1:
    raise RuntimeError(f"expected exactly one managed script: {entries!r}")
script=entries[0]
if script.get("id")!=1 or script.get("enable") is not True or script.get("running") is not True:
    raise RuntimeError(f"managed script did not recover: {script!r}")

status=get("/rpc/Script.GetStatus?id=1")
if status.get("running") is not True:
    raise RuntimeError(f"Script.GetStatus not running: {status!r}")

source=read_source(1)
source_bytes=len(source.encode("utf-8"))
source_sha=hashlib.sha256(source.encode("utf-8")).hexdigest()
if source_bytes!=EXPECTED_SOURCE_BYTES or source_sha!=EXPECTED_SOURCE_SHA256:
    raise RuntimeError(f"source changed: {source_bytes} B {source_sha}")

sched=get("/rpc/Schedule.List")
jobs=sched.get("jobs") if isinstance(sched,dict) else None
if jobs not in ([],None):
    raise RuntimeError(f"schedules changed: {jobs!r}")

switch=get("/rpc/Switch.GetStatus?id=0")
diag=get("/script/1/diag")
state=diag_state(diag)
uptime=state["deviceUptimeSec"]
if not isinstance(uptime,(int,float)) or uptime>=PRE_UPTIME:
    raise RuntimeError(f"uptime did not reset after physical power-cycle: {uptime!r}")
if state["controlMode"]!="auto":
    raise RuntimeError(f"runtime did not return AUTO: {state!r}")
if state["safetyLockout"] is not False:
    raise RuntimeError(f"unexpected safety lockout: {state!r}")

records=[]
for slot in range(24):
    ok,item=curl_once(f"/rpc/KVS.Get?key=shellylink.history.{slot:02d}")
    if not ok or not isinstance(item,dict) or not isinstance(item.get("value"),str):
        continue
    try: seg=json.loads(item["value"])
    except Exception: continue
    if isinstance(seg,list) and len(seg)==2 and seg[0]==2 and isinstance(seg[1],list):
        for rec in seg[1]:
            if isinstance(rec,list) and len(rec)==11:
                records.append({"slot":slot,"record":rec})

recent=[x for x in records if isinstance(x["record"][1],(int,float)) and x["record"][1] <= uptime+10]
boot=[x for x in recent if x["record"][6]=="b" and x["record"][7]=="st" and (x["record"][5] & 2)==0]
if not boot:
    raise RuntimeError(f"no boot-safe OFF record after physical power-cycle; recent={recent!r}")

print(json.dumps({
  "identity":{"id":info.get("id"),"model":info.get("model"),"gen":info.get("gen"),"fw_id":info.get("fw_id"),"ver":info.get("ver")},
  "preUptimeSec":PRE_UPTIME,
  "postUptimeSec":uptime,
  "script":script,
  "scriptStatus":status,
  "sourceBytes":source_bytes,
  "sourceSha256":source_sha,
  "scheduleCount":0 if jobs in ([],None) else len(jobs),
  "switch":{"output":switch.get("output"),"apower":switch.get("apower"),"current":switch.get("current"),"voltage":switch.get("voltage")},
  "diagState":state,
  "recentHistory":recent,
  "bootSafeOffRecords":boot
},indent=2,sort_keys=True))
