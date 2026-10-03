from pathlib import Path

ux = Path('scripts/quality/ux-gate.mjs')
s = ux.read_text()
old_import = "import { readFile, readdir } from 'node:fs/promises';\n"
new_import = "import { createHash } from 'node:crypto';\nimport { readFile, readdir } from 'node:fs/promises';\n"
assert old_import in s
s = s.replace(old_import, new_import, 1)

anchor = "const repoRoot = new URL('../../', import.meta.url);\nconst failures = [];\n"
assert anchor in s
frozen = """const repoRoot = new URL('../../', import.meta.url);\nconst failures = [];\n\nconst frozenClimateVisuals = Object.freeze({\n  'apps/mobile/e2e/responsive.spec.ts-snapshots/01-plugs-dashboard-darwin.png':\n    '91ecf3b388a6360f60ed0396add6539647988c20',\n  'apps/mobile/e2e/responsive.spec.ts-snapshots/02-climate-automation-darwin.png':\n    '8a0080b8f47d8457dd8e134c02c7379dbb93e6c4',\n  'apps/mobile/e2e/responsive.spec.ts-snapshots/03-climate-ble-darwin.png':\n    '0449d4c2779a2d309c96d085fa1e486d58699f26',\n  'apps/mobile/e2e/responsive.spec.ts-snapshots/05-climate-device-darwin.png':\n    '680848e54cc180f58fbfa183ca1b55ed637bff21',\n  'apps/mobile/e2e/responsive.spec.ts-snapshots/06-climate-script-darwin.png':\n    'da898ad737411dab276508fe92e7f502152b5569',\n  'apps/mobile/e2e/responsive.spec.ts-snapshots/07-climate-info-darwin.png':\n    '05f2aaa22c0349c97616883e97b8f0f6f53684cd'\n});\n"""
s = s.replace(anchor, frozen, 1)

insert_before = "const checkDisclosureContract = async () => {\n"
assert insert_before in s
check = """const checkFrozenClimateVisualContract = async () => {\n  for (const [path, expectedGitBlobSha] of Object.entries(frozenClimateVisuals)) {\n    const bytes = await readFile(new URL(path, repoRoot));\n    const actualGitBlobSha = createHash('sha1')\n      .update(`blob ${bytes.length}\\0`)\n      .update(bytes)\n      .digest('hex');\n    if (actualGitBlobSha !== expectedGitBlobSha) {\n      addFailure(\n        path,\n        `accepted Climate golden UI is frozen at branch golden/climate-ui-20260928 (expected ${expectedGitBlobSha}, got ${actualGitBlobSha})`\n      );\n    }\n  }\n};\n\n"""
s = s.replace(insert_before, check + insert_before, 1)

call_anchor = "await checkCanonicalVisualPlatformContract();\nawait checkDisclosureContract();\n"
assert call_anchor in s
s = s.replace(
    call_anchor,
    "await checkCanonicalVisualPlatformContract();\nawait checkFrozenClimateVisualContract();\nawait checkDisclosureContract();\n",
    1,
)
ux.write_text(s)

doc = Path('docs/UX_VISUAL_CONTRACT.md')
s = doc.read_text()
old_rule = "7. The accepted Climate dashboard card remains frozen unless a task explicitly changes its design.\n"
new_rule = "7. The accepted Climate humidity dashboard card and Plug detail tab layout are frozen golden UI. Refactors must preserve their committed macOS screenshots byte-for-byte; changing them requires an explicit product-design decision, not snapshot refresh as part of unrelated work.\n"
assert old_rule in s
s = s.replace(old_rule, new_rule, 1)
anchor = "## Canonical states\n"
assert anchor in s
section = """## Frozen Climate golden master\n\nThe accepted target is permanently recoverable from branch `golden/climate-ui-20260928` at commit `823b51ef0d58ff731d8d25df8d54db968d97cea5`. The frozen visual contract covers the Plugs dashboard Climate card plus the Climate Automation, BLE, Device, Script, and Info detail states (`01`, `02`, `03`, `05`, `06`, `07`). `pnpm quality:ux` verifies the Git blob identity of those baselines so a routine refactor or `e2e:visual:update` cannot silently redefine the accepted design.\n\nThis freeze protects visual composition, geometry, ordering, spacing, controls, and tab chrome. Internal implementation may be modularized and reused by other automation types as long as these golden renders remain unchanged.\n\n"""
s = s.replace(anchor, section + anchor, 1)
doc.write_text(s)
