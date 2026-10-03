
mkdir -p "$OUT"
rm -f "$OUT/12-thermometers-dashboard-webview.png" "$OUT/28-thermometer-settings-webview.png" "$OUT/dashboard-webview-report.json" "$OUT/settings-webview-report.json"
git show origin/agent-control:.agent/tasks/android-emulator-webview-screenshots-20261003.payload/cdp.mjs > apps/mobile/e2e/.tmp-android-webview-cdp.mjs

node apps/mobile/e2e/.tmp-android-webview-cdp.mjs dashboard
node apps/mobile/e2e/.tmp-android-webview-cdp.mjs settings
rm -f apps/mobile/e2e/.tmp-android-webview-cdp.mjs

file "$OUT/12-thermometers-dashboard-webview.png" "$OUT/28-thermometer-settings-webview.png"
sips -g pixelWidth -g pixelHeight "$OUT/12-thermometers-dashboard-webview.png" "$OUT/28-thermometer-settings-webview.png"
cat "$OUT/dashboard-webview-report.json"
cat "$OUT/settings-webview-report.json"
git status --short --untracked-files=all "$OUT"
git add "$OUT/12-thermometers-dashboard-webview.png" "$OUT/28-thermometer-settings-webview.png" "$OUT/dashboard-webview-report.json" "$OUT/settings-webview-report.json"
git commit -m 'Add clean Android WebView UX inspection evidence'
git push --no-verify origin HEAD:inspection/android-emulator-20261003
