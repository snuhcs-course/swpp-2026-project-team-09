# README architecture and demo visualizations

Status: ready-for-agent
State: completed after source and rendered review
Updated: 2026-09-27

## Request

Before the user's planned push, explain the current client/server structure and three representative demos visually in the root README. Keep Korean labels legible and inside their boxes, without overlaps. Push is not part of this documentation task.

## Scope

- One client/server/data overview and event, friend-meetup, campus-convenience diagrams.
- Current source is authoritative for implemented behavior; proposal-only and unverified features are labeled separately.
- Preserve the existing runtime/configuration guide. No runtime, schema, or API changes.
- Version static images and reproducible rendering source. No root workspace or package manifest.

## Acceptance

- Cross-check diagram edges and data ownership against main/socket/worker/match/mobile code.
- Include the distinction between match-created parties and explicitly saved shared plans, versus friend-accept transaction creating both party and quest.
- Explain HTTP data access versus Socket.IO change hints, main's durable outbox versus worker/match Pub/Sub, cache versus queue Redis, and timetable-derived private class quests.
- State actual integration limits: AI matching/chat/walking/FCM, library deferral, observed shuttle information, and physical two-device/background validation.
- Render all four images and the README; inspect desktop and narrow layouts, text bounding boxes, image sizes and local links. Changes pass diff checks and instruction-file parity.
- Reviewed worktree commits squash into 0.0/Main; do not push.

## Delivered

- Root README contains one connected architecture image and three demo flows, with adjacent Korean explanations. Each image links to its full-resolution PNG.
- `docs/diagrams/render.py` is the editable source; `docs/diagrams/README.md` gives regeneration/font commands; `content-notes.md` links each behavior to code.
- Preserved the existing README from `## 구성` onward byte-for-byte. No runtime, API, schema, dependency or credential changes.
- GPT-6 Astra Medium agents worked in separate content and image worktrees. Coordinator reviewed all four previews and requested clearer topology and runtime details. A separate final code audit found no material factual mismatch.

## Verification

- All four PNGs use 2400px width. Measured font bounds, pairwise text overlap, connector/text collision and connector/card crossing assertions pass. Full-resolution and 900px previews were visually inspected.
- Regenerating with the same font/runtime produced byte-identical PNGs. Assets total approximately 1.56 MiB.
- Root README rendered locally through marked and Chromium with GitHub-like styling. At 1100px viewport, all four images load at 900px content width; at 390px viewport, they fit 350px content width. Document scroll width equals viewport width in both cases. Desktop and narrow screenshots show no clipping or horizontal overflow. Narrow views use the original-image link for detailed reading.
- All relative documentation/image links resolve. Existing setup guide comparison, `git diff --check`, and AGENTS/CLAUDE content parity pass.
- Preview HTML, screenshots and browser validation output remain local under ignored `artifacts/readme-visual-qa/`; they are not shipped. Live GitHub rendering was not tested because this task does not push.
- Application tests were not rerun for this documentation-only change; no running services or data were changed.

## Integration

Reviewed integration branch is squash-merged into `0.0/Main`. No push is performed as part of this request.
