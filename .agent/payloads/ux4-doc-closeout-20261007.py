from pathlib import Path

p = Path("docs/HANDOFF_NEXT_CHAT.md")
s = p.read_text()
start = s.index("### Current handoff cut")
end = s.index("## Verification boundary")
replacement = """### Current handoff cut

The bounded Pulse UX correction batch is complete through UX-4. Standalone Pulse reuses History v2 and exposes exactly three History panels: Output, Power and Current. Climate keeps its accepted five-panel History presentation unchanged.

UX-4 passed focused runtime/mobile tests, responsive Pulse E2E, reviewed Darwin visuals, the canonical `pnpm check`, and a real Plug S Gen3 smoke of the generated History writer. Detailed evidence is in `docs/testing/pulse-history-standalone-acceptance-2026-10-07.md`.

Time + Pulse History remains intentionally unimplemented and is a separate product decision. Do not reopen the completed Pulse UX batch without a concrete defect or explicit new requirement.

"""
verification = """## Verification boundary

The audit hardening passed its focused lifecycle suites, the canonical `pnpm check` and GitHub CI. Fresh real-device evidence covers Wi-Fi loss/recovery, the 16/16 final runtime matrix, final device postflight and standalone Pulse History v2. UX-4 passed the canonical `pnpm check`, responsive/visual acceptance and a real generated-runtime smoke with exact preflight restoration. The 8-hour soak remains intentionally deferred.
"""
p.write_text(s[:start] + replacement + verification)

p = Path("docs/ARCHITECTURE.md")
s = p.read_text()
old = "Qualified Pulse runtime evidence is recorded in `docs/testing/pulse-v1-climate-runtime-acceptance-2026-10-01.md`, `docs/testing/pulse-v1-time-runtime-acceptance-2026-10-01.md` and `docs/testing/pulse-v1-standalone-runtime-acceptance-2026-10-02.md`."
new = "Qualified Pulse runtime evidence is recorded in `docs/testing/pulse-v1-climate-runtime-acceptance-2026-10-01.md`, `docs/testing/pulse-v1-time-runtime-acceptance-2026-10-01.md`, `docs/testing/pulse-v1-standalone-runtime-acceptance-2026-10-02.md` and `docs/testing/pulse-history-standalone-acceptance-2026-10-07.md`."
assert old in s
p.write_text(s.replace(old, new, 1))

p = Path("docs/testing/hardware-matrix.md")
s = p.read_text()
anchor = "| 2026-10-06 | Final Stage 9 device postflight excluding 8h soak | PASS |"
idx = s.index(anchor)
line_end = s.index("\n", idx)
row = "| 2026-10-07 | Standalone Pulse History v2 hardware smoke | PASS | Exact UX-4 candidate `3b4de6f47c313c74833eafe4a912aa4095080f34` passed real-device Pulse transition and shared History v2 persistence checks. Cleanup restored the exact preflight script state, left relay OFF and removed the UX-4 History keys. Detailed evidence: `docs/testing/pulse-history-standalone-acceptance-2026-10-07.md`. |"
assert row not in s
p.write_text(s[:line_end+1] + row + "\n" + s[line_end+1:])
