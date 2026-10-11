import os
import re
import subprocess
import time
import xml.etree.ElementTree as ET

sdk = os.environ.get("ANDROID_SDK_ROOT") or os.environ.get("ANDROID_HOME") or os.path.expanduser("~/Library/Android/sdk")
adb = os.path.join(sdk, "platform-tools", "adb")
serials = []
for line in subprocess.check_output([adb, "devices"], text=True).splitlines()[1:]:
    parts = line.split()
    if len(parts) >= 2 and parts[1] == "device":
        serials.append(parts[0])
if len(serials) != 1:
    raise SystemExit(f"expected exactly one adb device, got {serials}")
serial = serials[0]

def run(*args, check=True):
    return subprocess.run([adb, "-s", serial, *args], check=check, text=True, capture_output=True)

def dump(label):
    run("shell", "uiautomator", "dump", "/sdcard/shelly-ui.xml", check=False)
    xml = run("shell", "cat", "/sdcard/shelly-ui.xml", check=False).stdout.strip()
    print(f"=== {label} ===")
    if not xml.startswith("<?xml") and not xml.startswith("<hierarchy"):
        print("NO_UI_XML")
        return []
    root = ET.fromstring(xml)
    items = []
    for n in root.iter("node"):
        text = n.attrib.get("text", "").strip()
        desc = n.attrib.get("content-desc", "").strip()
        clickable = n.attrib.get("clickable", "false") == "true"
        bounds = n.attrib.get("bounds", "")
        if text or desc or clickable:
            item = {"text": text, "desc": desc, "clickable": clickable, "bounds": bounds}
            items.append(item)
            print(f"text={text!r} desc={desc!r} clickable={clickable} bounds={bounds}")
    return items

def center(bounds):
    m = re.fullmatch(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", bounds)
    if not m:
        raise ValueError(bounds)
    x1, y1, x2, y2 = map(int, m.groups())
    return (x1 + x2) // 2, (y1 + y2) // 2

def tap_item(item, label):
    x, y = center(item["bounds"])
    print(f"TAP {label}: {x},{y}")
    run("shell", "input", "tap", str(x), str(y))
    time.sleep(1.2)

def find_exact(items, names):
    lowered = {x.lower() for x in names}
    for item in items:
        if item["text"].lower() in lowered or item["desc"].lower() in lowered:
            return item
    return None

start = dump("start")
thermo_tab = find_exact(start, ["Termometry", "Thermometers"])
if thermo_tab:
    tap_item(thermo_tab, "thermometers-tab")
    thermos = dump("thermometers-dashboard")
    detail = None
    for item in thermos:
        d = item["desc"].lower()
        if "ustawienia termometru" in d or ("thermometer" in d and "settings" in d):
            detail = item
            break
    if detail:
        tap_item(detail, "thermometer-settings")
        dump("thermometer-detail")
    else:
        print("THERMOMETER_DETAIL_ACTION_NOT_FOUND")
else:
    print("THERMOMETERS_TAB_NOT_FOUND")

current = dump("before-plugs")
plugs_tab = find_exact(current, ["Plugs", "Wtyczki", "Gniazdka"])
if plugs_tab:
    tap_item(plugs_tab, "plugs-tab")
    plugs = dump("plugs-dashboard")
    keywords = ("time", "harmonogram", "schedule", "auto", "manual", "daily", "working")
    matched = []
    for item in plugs:
        hay = (item["text"] + " " + item["desc"]).lower()
        if any(k in hay for k in keywords):
            matched.append(item)
    print("=== time-related-visible-nodes ===")
    if matched:
        for item in matched:
            print(f"text={item['text']!r} desc={item['desc']!r} bounds={item['bounds']}")
    else:
        print("NONE")
else:
    print("PLUGS_TAB_NOT_FOUND")

# Leave the phone on Thermometers dashboard for visual review when possible.
final_items = dump("before-final-navigation")
thermo_tab = find_exact(final_items, ["Termometry", "Thermometers"])
if thermo_tab:
    tap_item(thermo_tab, "leave-on-thermometers")
    dump("final-thermometers-dashboard")
