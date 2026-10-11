from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    target = Path(path)
    text = target.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one anchor, got {count}")
    target.write_text(text.replace(old, new, 1))

replace_once(
    "docs/ARCHITECTURE.md",
    "Plug Detail is one product surface with five local sections:\n\n```text\nAutomation | BLE | Device | Script | Info\n```\n\nThey are presentation boundaries, not new domain owners:\n",
    "Plug Detail is one physical-device surface with capability-driven local sections. The shared capability vocabulary is:\n\n```text\nAutomation | BLE | Device | Script | Info\n```\n\nA Plug shows only the sections supported by its ownership model. Climate exposes all five. Native Time Schedule omits `Script`. A plain saved Plug keeps the physical-device surfaces and an Automation empty state rather than inventing another detail shell. These sections are presentation boundaries, not new domain owners:\n",
)
replace_once(
    "docs/ARCHITECTURE.md",
    "The five tabs remain the first Plug Detail content. Top-level detail/intent pages do not render a duplicate page-local Back when persistent bottom navigation or platform/browser Back already returns to the parent product section.",
    "The available capability tabs remain the first Plug Detail content. Top-level detail/intent pages do not render a duplicate page-local Back when persistent bottom navigation or platform/browser Back already returns to the parent product section.",
)

replace_once(
    "docs/ROADMAP.md",
    "Plug Detail now starts directly with the five-tab surface; the intermediate identity summary card was removed and identity/model/transport detail remains owned by **Info**. This did not change managed Button Mode ownership: Climate still keeps Plug S Gen3 `detached` while it owns the relay.\n",
    "Plug Detail now starts directly with the shared capability-driven tab surface; the intermediate identity summary card was removed and identity/model/transport detail remains owned by **Info**. Climate exposes Script because it owns a managed runtime; native Time Schedule does not invent a Script tab. This did not change managed Button Mode ownership: Climate still keeps Plug S Gen3 `detached` while it owns the relay.\n",
)
anchor = "Redundant top-level `← Plugs` controls were removed from automation intent, Time detail and top-level not-found states; page-local Back remains only for true nested subflows that return to a specific parent context.\n\n"
addition = """Redundant top-level `← Plugs` controls were removed from automation intent, Time detail and top-level not-found states; page-local Back remains only for true nested subflows that return to a specific parent context.\n\n### UX component unification — completed 2026-09-28\n\nClimate remains the frozen visual target while Time now uses the same Plug dashboard/control language and capability-driven detail shell. Time AUTO/MANUAL maps to native Schedule ownership, MANUAL exposes explicit ON/OFF, and Plug telemetry/detail affordances reuse the shared Plug patterns rather than a parallel Time design.\n\nShared add-device segmented navigation now lives in `@lcl/ui`. Managed Climate Button Mode is presented as read-only while Climate owns the relay. Add Plug keeps technical scan-range editing behind a compact disclosure. Thermometer dashboard cards prioritize readings and compact telemetry, while rename/PVVX/delete/technical identity live in nested Thermometer settings under `features/thermometers`.\n\n"""
replace_once("docs/ROADMAP.md", anchor, addition)
replace_once(
    "docs/ROADMAP.md",
    "### 4. Dashboard control/status polish\n\nPresent the two Climate control modes clearly without introducing another user mode. Keep AUTO/MANUAL, requested output, final output, automation-fault state and hard-safety state understandable at a glance.\n",
    "### 4. Dashboard status polish\n\nKeep the frozen shared card/control geometry. Improve only the operational status layer after History/safety data exists: requested output, final output, reason, automation-fault state and hard-safety state should be understandable at a glance without introducing another Climate mode or another card design.\n",
)

print("Updated durable architecture/roadmap docs for the UX handoff")
