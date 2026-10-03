# Product matrix persistent corpus

This directory contains replayable regression cases for the deterministic Shelly Link product matrix.

The normal gate generates a fresh deterministic corpus from seed `1337` and then replays every JSON case in this directory. Generated cases belong in the temporary output directory, not in git. A generated case should be promoted here when it exposes a real bug, a meaningful boundary, or a composition that must never regress.

Each fixture records the exact case seed, dimensions, expected accept/reject class and configuration. Keep fixtures data-only; the replay invariants stay in `scripts/analysis/product-matrix/replay.ts` so the corpus cannot silently create a second implementation of product behavior.

The initial baseline intentionally pins representative high-risk compositions: four-sensor mixed Climate with VPD + overnight Pulse window, overnight Time + Pulse, delayed bounded standalone Pulse, Pulse boundary behavior, duplicate Climate sensor identity rejection and equal Time boundary rejection.
