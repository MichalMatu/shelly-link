from pathlib import Path

repo = Path('.')
plug_path = repo / 'apps/mobile/src/features/plugs/components/PlugAddPage.tsx'
test_path = repo / 'apps/mobile/src/features/plugs/components/PlugAddPage.test.tsx'
e2e_path = repo / 'apps/mobile/e2e/responsive.spec.ts'
doc_path = repo / 'docs/UX_VISUAL_CONTRACT.md'

plug = plug_path.read_text()
old_import = "import { SegmentedControl } from '@lcl/ui';"
new_import = "import { Disclosure, SegmentedControl } from '@lcl/ui';"
if plug.count(old_import) != 1:
    raise SystemExit(f'expected one SegmentedControl import, got {plug.count(old_import)}')
plug = plug.replace(old_import, new_import, 1)

helper_anchor = "export type PlugAddPageProps = {\n  manual: ManualPlugAddProps;\n  scan: PlugNetworkScanProps;\n};\n\n"
helper = """const formatScanRangeSummary = (startInput: string, endInput: string): string => {
  const startParts = startInput.split('.');
  const endParts = endInput.split('.');
  if (
    startParts.length === 4 &&
    endParts.length === 4 &&
    startParts.slice(0, 3).join('.') === endParts.slice(0, 3).join('.')
  ) {
    return `${startInput}–${endParts[3]}`;
  }
  return `${startInput}–${endInput}`;
};

"""
if helper_anchor not in plug:
    raise SystemExit('PlugAddPage props anchor not found')
if 'const formatScanRangeSummary' in plug:
    raise SystemExit('formatScanRangeSummary already present')
plug = plug.replace(helper_anchor, helper_anchor + helper, 1)

summary_anchor = """  const shouldShowEmptyScanResult =
    scan.success && !scan.stopped && scan.results.length === 0;
"""
summary_replacement = summary_anchor + """  const scanRangeSummary = scan.rangeError
    ? t('hardware.shelly.scanRangeFailed')
    : formatScanRangeSummary(scan.startInput, scan.endInput);
"""
if plug.count(summary_anchor) != 1:
    raise SystemExit('scan empty-result anchor not found exactly once')
plug = plug.replace(summary_anchor, summary_replacement, 1)

range_start = plug.find('            <div className="shelly-network-scan__range">')
range_end_marker = '\n\n            {shouldShowEmptyScanResult'
range_end = plug.find(range_end_marker, range_start)
if range_start == -1 or range_end == -1:
    raise SystemExit('scan range block boundaries not found')
range_block = plug[range_start:range_end]
wrapped = """            <Disclosure
              className="shelly-network-scan__range-disclosure"
              summary={t('hardware.shelly.scanRangeLabel')}
              summaryEnd={scanRangeSummary}
            >
""" + '\n'.join('  ' + line if line else line for line in range_block.splitlines()) + """
            </Disclosure>"""
plug = plug[:range_start] + wrapped + plug[range_end:]
plug_path.write_text(plug)

translations = {
    'en.ts': 'Scan range',
    'pl.ts': 'Zakres skanowania',
    'de.ts': 'Scanbereich',
    'it.ts': 'Intervallo di scansione',
    'fr.ts': 'Plage de scan',
    'es.ts': 'Rango de escaneo',
    'ptBr.ts': 'Intervalo de escaneamento',
}
for filename, label in translations.items():
    path = repo / 'apps/mobile/src/app/locales' / filename
    text = path.read_text()
    if 'scanRangeLabel:' in text:
        raise SystemExit(f'scanRangeLabel already exists in {filename}')
    lines = text.splitlines()
    indexes = [i for i, line in enumerate(lines) if line.strip().startswith('scanRangeFailed:')]
    if len(indexes) != 1:
        raise SystemExit(f'expected one scanRangeFailed in {filename}, got {len(indexes)}')
    index = indexes[0]
    indent = lines[index][: len(lines[index]) - len(lines[index].lstrip())]
    lines.insert(index + 1, f"{indent}scanRangeLabel: '{label}',")
    path.write_text('\n'.join(lines) + '\n')

unit = test_path.read_text()
insert_before = """  it('keeps manual validation local and submits only valid input', () => {
"""
unit_test = """  it('keeps the technical scan range behind a compact disclosure', () => {
    const props = createProps();
    renderPage(props);

    const summary = screen.getByText('Scan range');
    const disclosure = summary.closest('details');
    expect(disclosure).not.toBeNull();
    expect(disclosure).not.toHaveAttribute('open');
    expect(screen.getByText('192.168.0.1–99')).toBeInTheDocument();

    fireEvent.click(summary);

    expect(disclosure).toHaveAttribute('open');
    expect(screen.getByLabelText('From')).toHaveValue('192.168.0.1');
    expect(screen.getByLabelText('To')).toHaveValue('192.168.0.99');
    fireEvent.change(screen.getByLabelText('From'), {
      target: { value: '192.168.1.1' }
    });
    expect(props.scan.onStartInputChange).toHaveBeenCalledWith('192.168.1.1');
  });

"""
if unit.count(insert_before) != 1:
    raise SystemExit('unit test insertion anchor not found exactly once')
if 'keeps the technical scan range behind a compact disclosure' in unit:
    raise SystemExit('scan range unit test already present')
unit = unit.replace(insert_before, unit_test + insert_before, 1)
test_path.write_text(unit)

e2e = e2e_path.read_text()
e2e_anchor = """    await expect(page.getByRole('tablist', { name: 'Dodaj gniazdko' })).toBeVisible();
    if (viewport.name === 'phone-large') {
      await expectVisualScreen(page, '15-add-plug');
    }
"""
e2e_replacement = """    await expect(page.getByRole('tablist', { name: 'Dodaj gniazdko' })).toBeVisible();
    const scanRangeDisclosure = page.locator('.shelly-network-scan__range-disclosure');
    await expect(scanRangeDisclosure.getByText('Zakres skanowania')).toBeVisible();
    await expect(scanRangeDisclosure).not.toHaveAttribute('open', '');
    await expect(page.getByLabel('Od', { exact: true })).toBeHidden();
    if (viewport.name === 'phone-large') {
      await expectVisualScreen(page, '15-add-plug');
    }
"""
if e2e.count(e2e_anchor) != 1:
    raise SystemExit('Add Plug E2E insertion anchor not found exactly once')
if 'scanRangeDisclosure' in e2e:
    raise SystemExit('scan range E2E assertion already present')
e2e = e2e.replace(e2e_anchor, e2e_replacement, 1)
e2e_path.write_text(e2e)

doc = doc_path.read_text()
doc_anchor = "2. `@lcl/ui` owns reusable interaction geometry. The shared `SegmentedControl` component owns add-device tab structure and `lcl-segmented-control` geometry; Plug detail tabs and hardware setup top navigation reuse that geometry while keeping their distinct navigation semantics.\n"
doc_line = "   Plug Wi-Fi discovery keeps the editable IP scan range behind a compact disclosure; its collapsed summary still exposes the current range.\n"
if doc_anchor not in doc:
    raise SystemExit('UX visual contract anchor not found')
if doc_line.strip() in doc:
    raise SystemExit('Plug scan range UX contract already present')
doc = doc.replace(doc_anchor, doc_anchor + doc_line, 1)
doc_path.write_text(doc)

print('Simplified Plug scan range presentation without changing scan behavior')
