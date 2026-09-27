# Initial extraction evaluation

Status: needs-info
State: implemented; first quality evaluation has known failures
Measured: 2026-09-27

## Method

Apple M1,16GiB; native Ollama0.34.4; qwen3-vl:2b-instruct-q4_K_M; temperature0, context8192, output limit2000tokens, one request at a time. Existing Docker services and Android emulator remained running. Model was already loaded for the final set. These are four individual local observations, not p95, a representative OCR benchmark or a performance guarantee.

Generate controlled fixtures with `python3 tests/image-extraction-fixtures.py artifacts/image-extraction-evaluation` (Pillow; macOS AppleSDGothicNeo font). Fixtures are explicitly synthetic and never used as app/runtime feeds. Optional `EXTRACTION_CAPTURE_RESPONSE=1` saves actual model response envelopes to ignored artifacts for debugging; use it only with approved evaluation inputs.

Real poster: [SNU Cine Music Festival notice](https://www.snu.ac.kr/snunow/events?md=v&bbsidx=176192), [attached JPG](https://www.snu.ac.kr/snunow/events?md=down&bbsidx=176192&fileidx=57497). The normal download required the notice URL as HTTP Referer. Poster was visually checked, then scaled to1128×1600 JPEG quality85 to approximate mobile normalization. Original503275bytes; source image not checked in or rehosted. Image shows2026-09-29 18:30–19:30 and 중앙도서관 판사 주홍점·홍계수 옥상정원. The expected values came from image inspection, not inference output.

## Final results

Exact SHA256, outputs and field checks: [results.json](results.json).

| Input | Wall time | Observation |
| --- | ---: | --- |
| Synthetic complete Korean poster |14.99s| Title, start/end and location matched; descriptive text present. |
| Synthetic poster without year/end |11.92s| Title/location matched; start/end stayed null. |
| Synthetic weekly grid,3classes |28.03s| Semester dates and weekdays matched. Titles2/3, locations3/3, starts2/3, ends1/3; no fully correct class row. Half-hour boundaries and one course name failed. |
| Real SNU poster |27.04s| Title and start/end matched. Location had a character substitution, 홍계수 → 홈계수, requiring correction. |

**Decision:2B is currently an editable input aid, not an automatic registration-quality extractor.** Source comparison and explicit correction/save are mandatory in the UI. Real user timetable screenshots, more layouts, photographed/blurred posters and negative/adversarial images remain unevaluated. No claim of broad accuracy or full MVP acceptance.

## Changes driven by failures

Initial grid output gave hours in minute fields (9 instead of540). The model now reads Korean weekday names and HH:mm labels; code converts to the public weekday/minute representation. This removed unit conversion error in the checked example, but did not fix geometric block-boundary mistakes.

An intermediate ISO-constrained prompt invented2023 for a yearless poster. Event model output was changed to literal `scheduleText` transcription; a conservative server parser requires a full explicit year/month/day and supports known same-day clock formats. Missing year, unsupported/multiple dates and ambiguous endpoints stay null based on that transcription. It never supplies the current year. Model-created warnings were removed; the server emits consistent missing-field and review notices. Transcription itself can still be wrong, so this does not prove source truth.

No larger model was silently downloaded/selected. A further model evaluation is a separate choice after this evidence. No inference API fee was used; local compute/memory is still consumed.

## Integration

Build/API checks are recorded in [spec.md](spec.md). The [Android document-import flow](android-verification.md) also reached the real local model and populated an editable event draft; its model HTTP call took15.27s. This is separate from the four-input evaluation above and does not measure whole-screen latency. Unit tests use controlled fake HTTP responses and are separate from actual inference measurements.
