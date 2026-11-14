# 04: The admin site's "Settings" page changes the global settings

Parent: [A02 spec](../spec.md) ("The admin page "Settings"")
Status: ready-for-agent
Blocked by: 01, 02

## What to build

An Administrator opens "Settings" in the admin site's menu and sees every registered setting with its value. They change one, confirm, and the row shows "applies at HH:MM:00" until that minute has passed, then "applied". The page lists the history of changes. Today the only setting is `llm.provider`, shown as a select.

## Acceptance criteria

- [ ] Main server, under `admin/settings`, guarded like the other admin routes: the registered settings with their values, types, allowed values and the time the last change applies; saving one; the history.
- [ ] A save goes through ticket 01's service: an unregistered name, a wrong type, a value not allowed, or a provider without a key (ticket 02) is refused with 400 and a reason the page shows.
- [ ] Admin site: `admin/src/app/(signed-in)/settings/page.tsx` and a "Settings" entry in `SECTIONS` in `site-menu.tsx`. The page is generic over the registry: each row has the value, an input for its type and allowed values (a select for `llm.provider`), and a save that asks for confirmation.
- [ ] After a save, the row shows "applies at HH:MM:00" (the next minute), and "applied" once that time has passed.
- [ ] The history lists who changed what, when, and the old and new value, newest first.
- [ ] Any Administrator may change any setting; nothing depends on which Administrator.
- [ ] Tests (ADR 0007): main-server integration tests for the routes (save, each refusal, history); admin tests for the "applies at" and "applied" labels and the confirmation.
- [ ] The admin site's README names the "Settings" page.
- [ ] Screenshots of the page before and after a save, in the PR.
- [ ] Each changed source file has its AI-generated row; lint, format, type checks and the touched tests pass in the main server and in the admin site.

## Comments
