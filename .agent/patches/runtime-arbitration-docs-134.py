from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if text.count(old) != 1:
        raise SystemExit(f'expected one match in {path}, found {text.count(old)}')
    p.write_text(text.replace(old, new, 1))


replace_once(
    'docs/ARCHITECTURE.md',
    """Passive recovery may recognize and reconstruct valid Shelly Link-managed state, but passive reconciliation does not silently rewrite a valid runtime. Explicit install/edit/recover is the convergence boundary.\n\nTemporary BLE discovery is the exception to exclusive long-lived script ownership. It is short-lived, disabled for run-on-boot, pauses the managed automation when needed, cleans itself up and restores the automation path without redefining ownership.\n""",
    """Passive recovery may recognize and reconstruct valid Shelly Link-managed state, but passive reconciliation does not silently rewrite a valid runtime. Explicit install/edit/recover is the convergence boundary.\n\n### Climate runtime arbitration\n\nThe generated Climate runtime is the single final relay-decision owner for managed Climate automation. The frozen control priority is:\n\n```text\nFAULT\n  > PAUSED\n    > MANUAL\n      > AUTO\n```\n\nThe runtime exposes explicit `AUTO`, `MANUAL_OFF`, `MANUAL_ON`, `PAUSED` and `FAULT` states. Mobile control changes those runtime states through `Script.Eval`; manual ON/OFF is not implemented as a second phone-owned `Switch.Set` decision path. Returning from manual or paused operation to AUTO is always explicit.\n\nAUTO keeps the automation-requested relay state separate from the final relay state. Diagnostics preserve the existing compact fields and append control mode plus automation-requested output, alongside the existing reason code and transition uptime. FAULT/stale handling can therefore force the final relay OFF without erasing what normal automation requested.\n\nA managed Climate Plug uses detached physical-button mode so firmware cannot toggle the relay before the runtime arbiter sees the press. Install stores the prior button mode and converges to `detached`; recovery also repairs older managed installations; uninstall restores the saved mode. While managed, the settings UI cannot switch the button back to relay-controlled mode. The first physical press in AUTO enters `MANUAL_OFF` and only sends OFF when the relay was actually ON; later presses toggle `MANUAL_OFF <-> MANUAL_ON`. Physical takeover never silently returns to AUTO.\n\nTemporary BLE discovery is the exception to exclusive long-lived script ownership. It is short-lived, disabled for run-on-boot, pauses the managed automation when needed, cleans itself up and restores the automation path without redefining ownership.\n"""
)

replace_once(
    'docs/ROADMAP.md',
    """### 1. Runtime control/state arbitration\n\nFreeze the control semantics before expanding History or rules so every later feature records and respects the same states.\n""",
    """### 1. Runtime control/state arbitration — completed 2026-09-27\n\nThe Climate runtime now owns the final relay decision with explicit AUTO / MANUAL_OFF / MANUAL_ON / PAUSED / FAULT states, separate automation-requested versus final relay output, stable reason/transition diagnostics and deterministic physical-button takeover. Managed Climate installation converges the Plug button to detached mode and restores the previous mode on uninstall. Mobile manual controls change runtime state rather than bypassing the arbiter with direct relay RPC.\n\nThe frozen control semantics below are the vocabulary for History, safety and later rule/action work.\n"""
)

replace_once(
    'docs/HANDOFF_NEXT_CHAT.md',
    "Status: **2026-09-27 — Unified physical Plug registry completed; runtime control/state arbitration is next**",
    "Status: **2026-09-27 — Runtime control/state arbitration completed; History / Datalogger is next**"
)
replace_once(
    'docs/HANDOFF_NEXT_CHAT.md',
    """The Unified Physical Plug Registry slice is complete. BLE and verified Wi-Fi/HTTP locators enrich the same canonical physical record; hardware-setup consumes that registry through composition adapters and does not own a competing durable device list.\n\nFinal architecture checks for the slice found no endpoint-shaped `physicalId` seeds, no `shellyDevices` durable setup field and no private cross-feature imports of the Plug store. The legacy BLE storage key remains only in migration code and migration tests.\n\nNo new real-device acceptance was claimed by this slice; hardware evidence remains whatever is already recorded in `docs/testing/hardware-matrix.md`.\n""",
    """The Unified Physical Plug Registry slice is complete. BLE and verified Wi-Fi/HTTP locators enrich the same canonical physical record; hardware-setup consumes that registry through composition adapters and does not own a competing durable device list.\n\nRuntime control/state arbitration is also complete in product code. The generated Climate runtime is the sole final relay-decision owner and exposes AUTO / MANUAL_OFF / MANUAL_ON / PAUSED / FAULT. Automation-requested output is retained separately from final relay state; mobile manual controls change runtime mode through Script.Eval; physical takeover enters MANUAL_OFF on the first press and never silently returns to AUTO. Managed install/recovery converges the Plug button to detached mode and uninstall restores the saved prior mode. Diagnostics expose mode, requested output, reason and transition uptime for the upcoming History vocabulary.\n\nFinal architecture checks for the registry slice found no endpoint-shaped `physicalId` seeds, no `shellyDevices` durable setup field and no private cross-feature imports of the Plug store. The legacy BLE storage key remains only in migration code and migration tests.\n\nReal-device acceptance for each hardware-facing slice remains recorded only in `docs/testing/hardware-matrix.md`.\n"""
)
replace_once(
    'docs/HANDOFF_NEXT_CHAT.md',
    """## Current checkpoint\n\nThe Unified Physical Plug Registry slice is ready to merge after its final full repository gate. After merge, delete only its implementation/staging branches and preserve `work/kvs-datalogger`.\n\nThe immediate next slice is **Runtime control/state arbitration**. Begin with an audit of existing relay decision paths and physical-button handling before changing behavior. The target is one explicit arbiter for `AUTO`, `MANUAL`, `PAUSED` and `FAULT`, including the exact safe `MANUAL_OFF` takeover semantics above.\n""",
    """## Current checkpoint\n\nRuntime control/state arbitration is the completed checkpoint. Its code must remain the source vocabulary for subsequent History and safety work: AUTO / MANUAL_OFF / MANUAL_ON / PAUSED / FAULT, separate requested/final output, stable reason and transition diagnostics, explicit return to AUTO and detached-button physical takeover.\n\nThe immediate next slice is **History / Datalogger**. Resume from `work/kvs-datalogger` only as parked source material; reconcile it with current exclusive script ownership and the frozen arbitration vocabulary instead of mechanically merging the branch. Preserve `work/kvs-datalogger` until that work begins.\n"""
)
