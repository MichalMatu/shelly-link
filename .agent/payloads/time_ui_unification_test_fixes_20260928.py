from pathlib import Path

root = Path('.')

app_routes_path = root / 'apps/mobile/src/__tests__/app-routes.test.tsx'
app_routes = app_routes_path.read_text()
old = "fireEvent.click(screen.getByRole('button', { name: 'Szczegóły' }));"
new = "fireEvent.click(screen.getByRole('button', { name: 'Szczegóły: Lampa · Wi-Fi' }));"
if old not in app_routes:
    raise SystemExit('app-routes Time details button anchor missing')
app_routes_path.write_text(app_routes.replace(old, new, 1))

automation_detail_path = root / 'apps/mobile/src/__tests__/automation-detail.test.tsx'
automation_detail = automation_detail_path.read_text()
old = "expect(screen.getByRole('heading', { name: 'Lampa' })).toBeVisible();"
new = "expect(screen.queryByRole('heading', { name: 'Lampa' })).toBeNull();\n    expect(screen.getByRole('navigation', { name: 'Akcje gniazdka' })).toBeVisible();"
if old not in automation_detail:
    raise SystemExit('automation-detail Time heading anchor missing')
automation_detail_path.write_text(automation_detail.replace(old, new, 1))
