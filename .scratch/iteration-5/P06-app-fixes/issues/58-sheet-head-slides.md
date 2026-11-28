# 58: A sheet's head slides down with the sheet when it closes

Parent: [P06 spec](../spec.md)
Status: ready-for-human (built; waits for review)
Blocked by: None.

Native files: none. Releases: an app OTA update only.

## What happens now

Ticket 53 (PR 773) moved every sheet's title into `BottomSheet`'s head. `BottomSheet` keeps the content it last had open while it slides out (#705), but not the head. A head built from the sheet's open state is gone the moment its caller closes it, so the title and the rule vanish at the start of the 0.28 s slide, and the content jumps up. This affects 모집글, 행사 detail, 참여 확인, 시간 고르기 and the other sheets whose head depends on what they show. Found by `sheet-slide-down.integration.test.tsx`, which fails on `5.0/Main` since PR 773.

## What to build

`BottomSheet` keeps the head it last had open while it slides out, as it keeps its content.

## Acceptance

- [ ] `sheet-slide-down.integration.test.tsx` passes again (it fails on `5.0/Main`).

## Comments
