from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if text.count(old) != 1:
        raise SystemExit(f"{path}: expected one match, got {text.count(old)}")
    p.write_text(text.replace(old, new, 1))


replace_once(
    "apps/mobile/e2e/responsive.spec.ts",
    "    await expect(page.getByRole('heading', { name: 'Harmonogram' })).toBeVisible();\n",
    "    await expect(page.getByRole('heading', { name: 'Harmonogram' })).toHaveCount(0);\n"
    "    await expect(page.getByRole('button', { name: 'AUTO', exact: true })).toBeVisible();\n"
    "    await expect(page.getByRole('button', { name: 'MANUAL', exact: true })).toBeVisible();\n",
)
replace_once(
    "apps/mobile/e2e/responsive.spec.ts",
    "test('daily time automation completes pause, resume, edit and delete lifecycle', async ({\n  page\n}) => {",
    "test('daily time automation completes manual, auto, edit and delete lifecycle', async ({\n  page\n}) => {",
)
replace_once(
    "apps/mobile/e2e/responsive.spec.ts",
    "  await expect(page.getByRole('heading', { name: 'Shelly Plug S Gen3' })).toBeVisible();\n"
    "  await expect(page.getByText('06:30')).toBeVisible();",
    "  await expect(page.getByRole('navigation', { name: 'Akcje gniazdka' })).toBeVisible();\n"
    "  await expect(page.getByRole('heading', { name: 'Shelly Plug S Gen3' })).toHaveCount(0);\n"
    "  await expect(page.getByText('06:30')).toBeVisible();",
)

old = """    expect(await screen.findByText('Działa')).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Lampa' })).toBeNull();
    expect(screen.getByRole('navigation', { name: 'Akcje gniazdka' })).toBeVisible();
    expect(screen.getAllByText('08:00').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('20:00').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Natywny Shelly Schedule')).toBeVisible();
    expect(screen.getByText('ON', { exact: true })).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Wstrzymaj automatykę' }));
    expect(await screen.findByText('Wstrzymana')).toBeVisible();
    expect(shelly.relayOn).toBe(false);
    expect(shelly.jobs.every((job) => !job.enable)).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Wznów automatykę' }));
    expect(await screen.findByText('Działa')).toBeVisible();
    expect(shelly.relayOn).toBe(true);
    expect(shelly.jobs.every((job) => job.enable)).toBe(true);
"""
new = """    const auto = await screen.findByRole('button', { name: 'AUTO' });
    const manual = screen.getByRole('button', { name: 'MANUAL' });
    const relayGroup = screen.getByRole('group', { name: 'Wyjście' });
    const relayOn = within(relayGroup).getByRole('button', { name: 'ON' });
    const relayOff = within(relayGroup).getByRole('button', { name: 'OFF' });

    expect(screen.queryByRole('heading', { name: 'Lampa' })).toBeNull();
    expect(screen.getByRole('navigation', { name: 'Akcje gniazdka' })).toBeVisible();
    expect(screen.getAllByText('08:00').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('20:00').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('Natywny Shelly Schedule')).toBeNull();
    expect(auto).toHaveAttribute('aria-pressed', 'true');
    expect(manual).toHaveAttribute('aria-pressed', 'false');
    expect(relayOn).toBeDisabled();
    expect(relayOff).toBeDisabled();

    fireEvent.click(manual);
    await waitFor(() => expect(manual).toHaveAttribute('aria-pressed', 'true'));
    expect(shelly.relayOn).toBe(false);
    expect(shelly.jobs.every((job) => !job.enable)).toBe(true);
    expect(relayOn).toBeEnabled();
    expect(relayOff).toBeEnabled();

    fireEvent.click(relayOn);
    await waitFor(() => expect(shelly.relayOn).toBe(true));
    await waitFor(() => expect(relayOn).toHaveAttribute('aria-pressed', 'true'));

    fireEvent.click(relayOff);
    await waitFor(() => expect(shelly.relayOn).toBe(false));
    await waitFor(() => expect(relayOff).toHaveAttribute('aria-pressed', 'true'));

    fireEvent.click(auto);
    await waitFor(() => expect(auto).toHaveAttribute('aria-pressed', 'true'));
    expect(shelly.relayOn).toBe(true);
    expect(shelly.jobs.every((job) => job.enable)).toBe(true);
"""
replace_once("apps/mobile/src/__tests__/automation-detail.test.tsx", old, new)

print("Time detail E2E and unit contracts updated")
