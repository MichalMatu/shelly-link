from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"missing expected text in {path}: {old[:180]!r}")
    p.write_text(text.replace(old, new, 1))


# Time detail: make the Automation tab read as Status -> Configuration -> destructive action.
time_path = "apps/mobile/src/screens/TimeInstallationDetail.tsx"
old_time = '''            <section className="installation-automation-live-state plug-detail-section">
              {pulseInstallation ? (
                <Pulse.Operational.StatusSummary status={pulseQuery.data} />
              ) : (
                <OperationalStatus.TimeSummary
                  config={installation.config}
                  localTime={runtimeQuery.data?.clock.localTime}
                  relayOn={runtimeQuery.data?.relayOn}
                  state={runtimeState}
                />
              )}
              <dl className="automation-summary installation-detail-summary installation-detail-summary--flush">
                <div>
                  <dt>{t('time.clock')}</dt>
                  <dd>{runtimeQuery.data?.clock.localTime ?? '—'}</dd>
                </div>
              </dl>
            </section>

            <TimeScheduleSetupPage
              flow={{
                selectedShelly: {
                  id: installation.shelly.deviceId,
                  name: installation.shelly.name,
                  baseUrl: installation.shelly.baseUrl,
                  scriptIdInput: '1',
                  model: installation.shelly.model,
                  gen: installation.shelly.gen
                }
              }}
              editInstallationId={installation.id}
              inline
              onInstalled={() => {
                void runtimeQuery.refetch();
                if (pulseInstallation) void pulseQuery.refetch();
              }}
              onPendingChange={setTimeEditPending}
            />

            <div className="installation-detail-delete-action">
              <button
                className="secondary-action secondary-action--danger"
                type="button"
                disabled={deleteMutation.isPending || timeEditPending}
                onClick={() => setDeleteOpen(true)}
              >
                {t('time.detail.delete')}
              </button>
            </div>'''
new_time = '''            <div className="installation-detail-hierarchy">
              <section className="installation-detail-hierarchy__section">
                <h3 className="installation-detail-hierarchy__title">
                  {t('detail.currentState')}
                </h3>
                {pulseInstallation ? (
                  <Pulse.Operational.StatusSummary status={pulseQuery.data} />
                ) : (
                  <OperationalStatus.TimeSummary
                    config={installation.config}
                    localTime={runtimeQuery.data?.clock.localTime}
                    relayOn={runtimeQuery.data?.relayOn}
                    state={runtimeState}
                  />
                )}
                <dl className="automation-summary installation-detail-summary installation-detail-summary--flush">
                  <div>
                    <dt>{t('time.clock')}</dt>
                    <dd>{runtimeQuery.data?.clock.localTime ?? '—'}</dd>
                  </div>
                </dl>
              </section>

              <section className="installation-detail-hierarchy__section">
                <h3 className="installation-detail-hierarchy__title">
                  {t('detail.configuration')}
                </h3>
                <TimeScheduleSetupPage
                  flow={{
                    selectedShelly: {
                      id: installation.shelly.deviceId,
                      name: installation.shelly.name,
                      baseUrl: installation.shelly.baseUrl,
                      scriptIdInput: '1',
                      model: installation.shelly.model,
                      gen: installation.shelly.gen
                    }
                  }}
                  editInstallationId={installation.id}
                  inline
                  onInstalled={() => {
                    void runtimeQuery.refetch();
                    if (pulseInstallation) void pulseQuery.refetch();
                  }}
                  onPendingChange={setTimeEditPending}
                />
              </section>

              <section className="installation-detail-danger-zone">
                <h3 className="installation-detail-hierarchy__title">
                  {t('time.detail.delete')}
                </h3>
                <button
                  className="secondary-action secondary-action--danger"
                  type="button"
                  disabled={deleteMutation.isPending || timeEditPending}
                  onClick={() => setDeleteOpen(true)}
                >
                  {t('time.detail.delete')}
                </button>
              </section>
            </div>'''
replace_once(time_path, old_time, new_time)

# Standalone Pulse detail: separate runtime status, installed cycle configuration and uninstall.
pulse_path = "apps/mobile/src/app/StandalonePulseInstallationDetail.tsx"
old_pulse = '''            <section className="installation-automation-live-state plug-detail-section">
              <Pulse.Operational.StatusSummary status={pulseQuery.data} />
              <dl className="automation-summary installation-detail-summary">
                <div>
                  <dt>{pulseLabels.onSeconds}</dt>
                  <dd>{secondsLabel(installation.config.pulse.onMs)}</dd>
                </div>
                <div>
                  <dt>{pulseLabels.offSeconds}</dt>
                  <dd>{secondsLabel(installation.config.pulse.offMs)}</dd>
                </div>
                <div>
                  <dt>{pulseLabels.initialDelaySeconds}</dt>
                  <dd>{secondsLabel(installation.config.pulse.initialDelayMs)}</dd>
                </div>
                <div>
                  <dt>{pulseLabels.startPhase}</dt>
                  <dd>
                    {installation.config.pulse.startPhase === 'on'
                      ? pulseLabels.startOn
                      : pulseLabels.startOff}
                  </dd>
                </div>
                <div>
                  <dt>{pulseLabels.execution}</dt>
                  <dd>{executionLabel}</dd>
                </div>
              </dl>
            </section>

            <div className="installation-detail-delete-action">
              <button
                className="secondary-action secondary-action--danger"
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => setDeleteOpen(true)}
              >
                {managementLabels.deleteAction}
              </button>
            </div>'''
new_pulse = '''            <div className="installation-detail-hierarchy">
              <section className="installation-detail-hierarchy__section">
                <h3 className="installation-detail-hierarchy__title">
                  {t('detail.currentState')}
                </h3>
                <Pulse.Operational.StatusSummary status={pulseQuery.data} />
              </section>

              <section className="installation-detail-hierarchy__section">
                <h3 className="installation-detail-hierarchy__title">
                  {t('detail.configuration')}
                </h3>
                <dl className="automation-summary installation-detail-summary installation-detail-summary--flush">
                  <div>
                    <dt>{pulseLabels.onSeconds}</dt>
                    <dd>{secondsLabel(installation.config.pulse.onMs)}</dd>
                  </div>
                  <div>
                    <dt>{pulseLabels.offSeconds}</dt>
                    <dd>{secondsLabel(installation.config.pulse.offMs)}</dd>
                  </div>
                  <div>
                    <dt>{pulseLabels.initialDelaySeconds}</dt>
                    <dd>{secondsLabel(installation.config.pulse.initialDelayMs)}</dd>
                  </div>
                  <div>
                    <dt>{pulseLabels.startPhase}</dt>
                    <dd>
                      {installation.config.pulse.startPhase === 'on'
                        ? pulseLabels.startOn
                        : pulseLabels.startOff}
                    </dd>
                  </div>
                  <div>
                    <dt>{pulseLabels.execution}</dt>
                    <dd>{executionLabel}</dd>
                  </div>
                </dl>
              </section>

              <section className="installation-detail-danger-zone">
                <h3 className="installation-detail-hierarchy__title">
                  {managementLabels.deleteAction}
                </h3>
                <button
                  className="secondary-action secondary-action--danger"
                  type="button"
                  disabled={deleteMutation.isPending}
                  onClick={() => setDeleteOpen(true)}
                >
                  {managementLabels.deleteAction}
                </button>
              </section>
            </div>'''
replace_once(pulse_path, old_pulse, new_pulse)

# Shared hierarchy styling. Existing Climate classes stay unchanged.
css_path = "apps/mobile/src/features/plugs/components/PlugDetailTabs.css"
needle = '''.installation-detail-delete-action .secondary-action {
  width: auto;
}
'''
addition = needle + '''
.installation-detail-hierarchy {
  display: grid;
  gap: var(--lcl-spacing-lg);
  min-width: 0;
}

.installation-detail-hierarchy__section,
.installation-detail-danger-zone {
  display: grid;
  gap: var(--lcl-spacing-md);
  min-width: 0;
}

.installation-detail-hierarchy__section + .installation-detail-hierarchy__section,
.installation-detail-danger-zone {
  border-top: var(--lcl-border-width-sm) solid var(--lcl-color-border);
  padding-top: var(--lcl-spacing-lg);
}

.installation-detail-hierarchy__title {
  font-size: var(--lcl-font-size-md);
  line-height: var(--lcl-line-height-tight);
  margin: 0;
}

.installation-detail-danger-zone {
  justify-items: end;
}

.installation-detail-danger-zone .installation-detail-hierarchy__title {
  justify-self: start;
}

.installation-detail-danger-zone .secondary-action {
  width: auto;
}
'''
replace_once(css_path, needle, addition)

# Canonical visual evidence for standalone Pulse detail.
visual_path = "apps/mobile/e2e/visual-contract.ts"
replace_once(
    visual_path,
    "  '28-thermometer-settings'\n] as const;",
    "  '28-thermometer-settings',\n  '29-standalone-pulse-detail'\n] as const;"
)

pulse_spec = "apps/mobile/e2e/pulse-operational-status.spec.ts"
replace_once(
    pulse_spec,
    '''    expect(fullBox!.x + fullBox!.width).toBeLessThanOrEqual(
      surfaceBox!.x + surfaceBox!.width + 1
    );
  });''',
    '''    expect(fullBox!.x + fullBox!.width).toBeLessThanOrEqual(
      surfaceBox!.x + surfaceBox!.width + 1
    );
    if (viewport.name === 'phone-large') {
      await expectVisualScreen(page, '29-standalone-pulse-detail');
    }
  });'''
)

# Contract the intended hierarchy explicitly.
contract = "docs/UX_VISUAL_CONTRACT.md"
replace_once(
    contract,
    '''Physical Plug detail is capability-driven. Reuse the shared tab and surface components. Time and Climate may expose different capabilities, but must not own separate detail chrome.\n''',
    '''Physical Plug detail is capability-driven. Reuse the shared tab and surface components. Time and Climate may expose different capabilities, but must not own separate detail chrome.\n\nTime and standalone Pulse Automation detail are status-first and use the same information hierarchy: current operational state, configuration, then a visually separated destructive uninstall action. Time may edit its schedule inline inside Configuration; standalone Pulse remains read-only for runtime/configuration. Climate detail remains frozen and is not normalized into this hierarchy. Canonical states are `11-time-detail` and `29-standalone-pulse-detail`.\n'''
)
