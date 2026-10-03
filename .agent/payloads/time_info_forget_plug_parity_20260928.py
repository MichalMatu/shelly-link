from pathlib import Path

repo = Path('.')
time_path = repo / 'apps/mobile/src/screens/TimeInstallationDetail.tsx'
e2e_path = repo / 'apps/mobile/e2e/responsive.spec.ts'
doc_path = repo / 'docs/UX_VISUAL_CONTRACT.md'

time = time_path.read_text()
old_import = """  PlugAutomationModeControl,
  PlugBleDetailSurface,
  PlugDeviceSettingsSurface,
  PlugDetailTop,
  PlugInfoPanel,
  PlugRelayControls,
  usePlugInformationFlow,
  type PlugDetailTab
"""
new_import = """  PlugAutomationModeControl,
  PlugBleDetailSurface,
  PlugDeleteConfirmModal,
  PlugDeviceSettingsSurface,
  PlugDetailTop,
  PlugInfoPanel,
  PlugRelayControls,
  isSameShellyDevice,
  usePlugInformationFlow,
  useSavedPlugStore,
  type PlugDetailTab
"""
if time.count(old_import) != 1:
    raise SystemExit(f'expected one Time plug import block, got {time.count(old_import)}')
time = time.replace(old_import, new_import, 1)

state_anchor = """  const removeInstallation = useInstalledAutomationStore(
    (state) => state.removeInstallation
  );
  const [deleteOpen, setDeleteOpen] = useState(false);
"""
state_replacement = """  const removeInstallation = useInstalledAutomationStore(
    (state) => state.removeInstallation
  );
  const savedPlugs = useSavedPlugStore((state) => state.plugs);
  const removePlug = useSavedPlugStore((state) => state.removePlug);
  const savedDevice = savedPlugs.find((device) =>
    isSameShellyDevice(device.physicalId, installation.shelly.deviceId)
  );
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [forgetOpen, setForgetOpen] = useState(false);
"""
if time.count(state_anchor) != 1:
    raise SystemExit('Time state anchor not found exactly once')
time = time.replace(state_anchor, state_replacement, 1)

info_old = """        {activeTab === 'info' && (
          <PlugInfoPanel
            connection={{
              transport: 'wifi',
              baseUrl: installation.shelly.baseUrl
            }}
            information={informationQuery.data}
            loading={informationQuery.isPending}
            error={informationQuery.isError}
          />
        )}
"""
info_new = """        {activeTab === 'info' && (
          <section>
            <PlugInfoPanel
              connection={{
                transport: 'wifi',
                baseUrl: installation.shelly.baseUrl
              }}
              information={informationQuery.data}
              loading={informationQuery.isPending}
              error={informationQuery.isError}
            />
            {savedDevice && (
              <div className="installation-detail-delete-action">
                <button
                  className="secondary-action secondary-action--danger"
                  type="button"
                  onClick={() => setForgetOpen(true)}
                >
                  {t('hardware.shelly.deleteTitle')}
                </button>
              </div>
            )}
          </section>
        )}
"""
if time.count(info_old) != 1:
    raise SystemExit('Time Info block not found exactly once')
time = time.replace(info_old, info_new, 1)

modal_anchor = """      <AppToastViewport
        dismissLabel={t('toast.dismiss')}
"""
forget_modal = """      <PlugDeleteConfirmModal
        deviceName={forgetOpen && savedDevice ? savedDevice.name : null}
        onClose={() => setForgetOpen(false)}
        onConfirm={() => {
          if (!savedDevice) return;
          removePlug(savedDevice.physicalId);
          setForgetOpen(false);
          pushToast('ok', t('hardware.shelly.removed'));
        }}
      />

"""
if time.count(modal_anchor) != 1:
    raise SystemExit('Time toast anchor not found exactly once')
if 'deviceName={forgetOpen && savedDevice ? savedDevice.name : null}' in time:
    raise SystemExit('Time forget modal already present')
time = time.replace(modal_anchor, forget_modal + modal_anchor, 1)
time_path.write_text(time)

e2e = e2e_path.read_text()
e2e_anchor = """    await expectTimeDetailHierarchy(page);
    await expectNoHorizontalOverflow(page);
    expect(consoleProblems).toEqual([]);
"""
e2e_replacement = """    await expectTimeDetailHierarchy(page);

    await page.getByRole('button', { name: 'Informacje', exact: true }).click();
    const forgetPlugButton = page.getByRole('button', {
      name: 'Usuń gniazdko tylko z aplikacji'
    });
    await expect(forgetPlugButton).toBeVisible();
    if (viewport.name === 'phone-large') {
      await expectVisualScreen(page, '21-time-info');
    }
    await forgetPlugButton.click();
    const forgetPlugDialog = page.getByRole('dialog', { name: 'Usunąć gniazdko?' });
    await expect(forgetPlugDialog).toBeVisible();
    await expect(forgetPlugDialog).toContainText('Shelly Plug S Gen3');
    await forgetPlugDialog.getByRole('button', { name: 'Anuluj' }).click();
    await expect(forgetPlugDialog).toHaveCount(0);

    await expectNoHorizontalOverflow(page);
    expect(consoleProblems).toEqual([]);
"""
if e2e.count(e2e_anchor) != 1:
    raise SystemExit(f'expected one Time detail E2E anchor, got {e2e.count(e2e_anchor)}')
if "expectVisualScreen(page, '21-time-info')" in e2e:
    raise SystemExit('Time Info visual assertion already present')
e2e = e2e.replace(e2e_anchor, e2e_replacement, 1)
e2e_path.write_text(e2e)

doc = doc_path.read_text()
doc_anchor = """   Plug Wi-Fi discovery keeps the editable IP scan range behind a compact disclosure; its collapsed summary still exposes the current range.
"""
doc_line = """   Installed Time and Climate Plug details expose the same saved-Plug forget action from Info; forgetting the saved Plug does not uninstall durable automation ownership.
"""
if doc_anchor not in doc:
    raise SystemExit('UX contract Plug scan-range anchor not found')
if doc_line.strip() in doc:
    raise SystemExit('Time/Climate Info parity contract already present')
doc = doc.replace(doc_anchor, doc_anchor + doc_line, 1)
doc_path.write_text(doc)

print('Added saved Plug forget parity to Time Info without changing automation ownership')
