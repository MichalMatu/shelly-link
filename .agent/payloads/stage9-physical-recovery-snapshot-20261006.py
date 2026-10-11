import hashlib,json,subprocess
BASE="http://shellyplugsg3-e4b063d7f530.local"
EXPECTED="shellyplugsg3-e4b063d7f530"

def curl(path):
    p=subprocess.run(["curl","-sS","--connect-timeout","4","--max-time","8",BASE+path],capture_output=True,text=True)
    if p.returncode != 0:
        raise RuntimeError(f"curl failed {path}: {p.stderr.strip()}")
    try:
        return json.loads(p.stdout)
    except Exception as e:
        raise RuntimeError(f"invalid JSON {path}: {p.stdout[:200]}") from e

info=curl("/rpc/Shelly.GetDeviceInfo")
if info.get("id") != EXPECTED:
    raise RuntimeError(f"identity mismatch: {info.get('id')!r}")

scripts=curl("/rpc/Script.List")
entries=scripts.get("scripts") if isinstance(scripts,dict) else None
if not isinstance(entries,list) or len(entries)!=1:
    raise RuntimeError(f"expected exactly one script, got {entries!r}")
script=entries[0]
if script.get("id") != 1 or script.get("enable") is not True or script.get("running") is not True:
    raise RuntimeError(f"unexpected managed script state: {script!r}")

parts=[]
offset=0
for _ in range(64):
    x=curl(f"/rpc/Script.GetCode?id=1&offset={offset}&len=1024")
    data=x.get("data")
    left=x.get("left")
    if not isinstance(data,str) or not isinstance(left,(int,float)):
        raise RuntimeError(f"bad Script.GetCode response: {x!r}")
    parts.append(data)
    offset += len(data.encode("utf-8"))
    if left <= 0:
        break
    if not data:
        raise RuntimeError("Script.GetCode made no progress")
else:
    raise RuntimeError("Script.GetCode exceeded chunk limit")

source="".join(parts)
source_bytes=len(source.encode("utf-8"))
source_sha=hashlib.sha256(source.encode("utf-8")).hexdigest()
schedules=curl("/rpc/Schedule.List")
jobs=schedules.get("jobs") if isinstance(schedules,dict) else None
switch=curl("/rpc/Switch.GetStatus?id=0")
diag=curl("/script/1/diag")

records=[]
for slot in range(24):
    p=subprocess.run(["curl","-sS","--connect-timeout","2","--max-time","4",BASE+f"/rpc/KVS.Get?key=shellylink.history.{slot:02d}"],capture_output=True,text=True)
    if p.returncode != 0:
        continue
    try:
        item=json.loads(p.stdout)
        raw=item.get("value") if isinstance(item,dict) else None
        seg=json.loads(raw) if isinstance(raw,str) else None
    except Exception:
        continue
    if isinstance(seg,list) and len(seg)==2 and seg[0]==2 and isinstance(seg[1],list):
        for rec in seg[1]:
            if isinstance(rec,list) and len(rec)==11:
                records.append(rec)

recent=records[-12:]
print(json.dumps({
  "identity":{"id":info.get("id"),"model":info.get("model"),"gen":info.get("gen"),"fw_id":info.get("fw_id"),"ver":info.get("ver")},
  "script":script,
  "sourceBytes":source_bytes,
  "sourceSha256":source_sha,
  "scheduleCount":len(jobs) if isinstance(jobs,list) else None,
  "schedules":jobs,
  "switch":{"output":switch.get("output"),"apower":switch.get("apower"),"current":switch.get("current"),"voltage":switch.get("voltage")},
  "diag":diag,
  "recentHistory":recent
},indent=2,sort_keys=True))
