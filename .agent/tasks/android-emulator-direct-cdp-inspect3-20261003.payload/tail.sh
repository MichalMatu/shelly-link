
rm -rf "$OUT"
mkdir -p "$OUT"
git show origin/agent-control:.agent/tasks/android-emulator-direct-cdp-inspect2-20261003.payload/cdp.mjs > apps/mobile/e2e/.tmp-android-webview-cdp.mjs

node apps/mobile/e2e/.tmp-android-webview-cdp.mjs dashboard
"$ADB" exec-out screencap -p > "$OUT/12-thermometers-dashboard-device.png"
node apps/mobile/e2e/.tmp-android-webview-cdp.mjs settings
"$ADB" exec-out screencap -p > "$OUT/28-thermometer-settings-device.png"
rm -f apps/mobile/e2e/.tmp-android-webview-cdp.mjs

{
  echo '{'
  first=1
  for image in "$OUT"/*.png; do
    name=$(basename "$image")
    width=$(sips -g pixelWidth "$image" | awk '/pixelWidth:/{print $2}')
    height=$(sips -g pixelHeight "$image" | awk '/pixelHeight:/{print $2}')
    test -n "$width"
    test -n "$height"
    if [[ "$first" != "1" ]]; then echo ','; fi
    first=0
    printf '  "%s": {"width": %s, "height": %s}' "$name" "$width" "$height"
  done
  echo
  echo '}'
} > "$OUT/image-metadata.json"

file "$OUT"/*.png
cat "$OUT/image-metadata.json"
cat "$OUT/dashboard-report.json"
cat "$OUT/settings-report.json"

git status --short --untracked-files=all "$OUT"
git add "$OUT"
git commit -m 'Add Android emulator UX inspection evidence'
git push --no-verify origin HEAD:inspection/android-emulator-20261003
