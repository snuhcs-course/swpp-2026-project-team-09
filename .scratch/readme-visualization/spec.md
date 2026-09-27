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

## Revision: AWS-style architecture graphics

The user requested a more AWS-style visual treatment and explicitly authorized push after the update. Preserve the existing architecture and three demo meanings; this is a visual/documentation revision, not adoption of AWS infrastructure.

- Replace prose-heavy cards with generic resource icons, service boundaries, numbered directional flows, a white background and AWS-inspired category colors.
- Keep actual project component names and identify the current local Docker Compose arrangement. Do not introduce imaginary AWS services or deployment guarantees.
- Update all four PNGs and their renderer; retain Korean readability, explicit status labels, collision checks, editable source and original-size image links.
- Review at full resolution, README width and narrow layout. Confirm document links, deterministic generation and instruction-file parity.
- Squash into `0.0/Main` and perform a normal push to `origin/0.0/Main`; no force push.

Revision state: completed after visual and factual review.

Revision verification:
- Four images use original generic resource icons and actual service names, with numbered flows, thin orthogonal connectors and local Compose groups. Repeated icons are documented as different views of the same components.
- Full-resolution and 900px previews inspected. Renderer assertions now include icon/label collisions, group borders and arrowheads as well as text bounds. All four pass; repeated rendering is byte-identical (1,381,540 PNG bytes total).
- Final README rendered at 1100px and 390px viewport widths; all four images loaded, fit 900px/350px content widths and produced no horizontal overflow. Full-resolution links remain available for narrow screens.
- Final factual audit preserves data ownership, HTTP versus Socket.IO, main outbox versus ephemeral delivery, explicit event quest save versus atomic friend plan acceptance, and locally derived class quests.
- README architecture/demo explanations and setup guide are unchanged below the style introduction. All local links and instruction-file parity pass; no runtime or application changes.
- The reviewed worktree result is integrated by squash. The user's explicit authorization covers a normal push to `origin/0.0/Main`; remote commit identity is checked after pushing.
