from pathlib import Path

page_path = Path('apps/mobile/src/screens/hardware-setup/pages/TimeScheduleSetupPage.tsx')
page = page_path.read_text()
old_page_class = '      <div className="time-schedule-grid">\n'
new_page_class = '      <div className="time-schedule-setup-grid">\n'
if page.count(old_page_class) != 1:
    raise SystemExit(f'expected one Time setup grid class, got {page.count(old_page_class)}')
page_path.write_text(page.replace(old_page_class, new_page_class, 1))

css_path = Path('apps/mobile/src/screens/hardware-setup/pages/TimeScheduleSetupPage.css')
css = css_path.read_text()
selector_count = css.count('.time-schedule-grid')
if selector_count != 3:
    raise SystemExit(f'expected three local time-schedule-grid selectors, got {selector_count}')
css_path.write_text(css.replace('.time-schedule-grid', '.time-schedule-setup-grid'))

theme_path = Path('apps/mobile/src/theme/theme.css')
theme = theme_path.read_text()
shared_selector = '\n.time-schedule-grid {\n'
if shared_selector in theme:
    raise SystemExit('top-level shared time-schedule-grid unexpectedly still present before repair')
anchor = '.dashboard-shell {\n'
if anchor not in theme:
    raise SystemExit('dashboard-shell anchor not found')
shared_grid = '''/* Shared by Plug LED night-mode scheduling and other compact time pairs. */
.time-schedule-grid {
  display: grid;
  gap: var(--lcl-spacing-md);
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 8rem), 1fr));
}

.time-schedule-grid .field-stack {
  align-items: stretch;
  gap: var(--lcl-spacing-sm);
  min-width: 0;
  text-align: center;
}

'''
theme_path.write_text(theme.replace(anchor, shared_grid + anchor, 1))

print('Restored shared schedule grid and isolated Time setup grid')
