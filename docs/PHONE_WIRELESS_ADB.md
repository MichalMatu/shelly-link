# Wireless Android device workflow

Canonical physical Android target for current Shelly Link development: Samsung SM-S906B / S22+, Android 16.

Use Wireless ADB for normal native Android install, cold-start, log and UI proof. Do not fall back to USB merely because `adb devices` is initially empty: Android Wireless Debugging pairing and the active `_adb-tls-connect._tcp` session are separate.

## Routing

- Source edits, project builds and project tests belong to the `shelly-link` repository/Local Agent target.
- Mac-local device transport and live ADB proof may be executed through the execution-enabled `host-ops` target.
- Always resolve the current Local Agent target/binding from the runtime catalog; never persist a binding in this document.

## Connect

The phone and Mac must be on the same LAN and Android **Developer options -> Wireless debugging** must be enabled. Pairing is normally persistent; the active port may change.

```bash
adb start-server
adb mdns services
ENDPOINT="$(adb mdns services | awk '$2=="_adb-tls-connect._tcp" {print $3; exit}')"
test -n "$ENDPOINT"
adb connect "$ENDPOINT"
adb devices -l
```

Do not hard-code the IP:port from an earlier run. Discover `_adb-tls-connect._tcp` each time a connection is absent.

Before mutation, require exactly one authorized target and verify it is the expected phone:

```bash
SERIAL="$(adb devices | awk 'NR>1 && $2=="device" {print $1; exit}')"
test -n "$SERIAL"
test "$(adb -s "$SERIAL" shell getprop ro.product.model | tr -d '\r')" = "SM-S906B"
test "$(adb -s "$SERIAL" shell getprop ro.build.version.release | tr -d '\r')" = "16"
test "$(adb -s "$SERIAL" shell settings get global adb_wifi_enabled | tr -d '\r')" = "1"
```

Current package id is `app.shellylink.mobile`.

## Normal preserving-data install

For ordinary development acceptance preserve existing app state. Build/sync/assemble in the project workspace, then install the produced debug APK with `-r`:

```bash
pnpm --filter @lcl/mobile build
pnpm --filter @lcl/mobile exec cap sync android
printf 'sdk.dir=%s\n' "${ANDROID_SDK_ROOT:-${ANDROID_HOME:-$HOME/Library/Android/sdk}}" > apps/mobile/android/local.properties
(cd apps/mobile/android && ./gradlew assembleDebug)
APK="apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk"
test -f "$APK"
adb -s "$SERIAL" install -r "$APK"
```

Do not uninstall first unless the acceptance explicitly requires clean-install/fresh-store behavior. The existing `pnpm android:phone-alpha` flow is intentionally destructive and is for those explicit clean-install tests.

## Cold start and logs

After every native install used as acceptance evidence:

```bash
PACKAGE="app.shellylink.mobile"
adb -s "$SERIAL" shell am force-stop "$PACKAGE"
adb -s "$SERIAL" logcat -c
adb -s "$SERIAL" shell am start -W -n "$PACKAGE/.MainActivity"
sleep 2
PID="$(adb -s "$SERIAL" shell pidof "$PACKAGE" | tr -d '\r')"
test -n "$PID"
adb -s "$SERIAL" shell dumpsys activity activities | grep -m1 'mResumedActivity' || true
adb -s "$SERIAL" logcat -d --pid="$PID" -v brief '*:W' | tail -200
```

For a failure or suspicious UI/runtime result, capture a wider bounded log before changing code:

```bash
adb -s "$SERIAL" logcat -d -v threadtime | tail -1000
```

Inspect errors/warnings for the exact installed candidate. Do not claim real-device acceptance from build success alone.

## Evidence rules

Record the exact product commit/head used for the build, whether app data was preserved or cleared, the detected device/model/Android version, install result, cold-start result and relevant log outcome. Temporary APKs, screenshots and log files are evidence artifacts, not repository source unless intentionally promoted.
