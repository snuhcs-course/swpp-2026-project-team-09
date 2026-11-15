# 04: The admin site's "Settings" page changes the global settings

Parent: [A02 spec](../spec.md) ("The admin page "Settings"")
Status: ready-for-agent
Blocked by: 01, 02

## What to build

An Administrator opens "Settings" in the admin site's menu and sees every registered setting with its value. They change one, confirm, and the row shows "applies at HH:MM:00" until that minute has passed, then "applied". The page lists the history of changes. Today the only setting is `llm.key`, shown as a select of the keys' names, each with its provider. No key's value reaches the page.

## Acceptance criteria

- [x] Main server, under `admin/settings`, guarded like the other admin routes: the registered settings with their values, types, allowed values and the time the last change applies; saving one; the history.
- [x] A save goes through ticket 01's service: an unregistered name, a wrong type, a value not allowed, or a key name the pod has no key for (ticket 02) is refused with 400 and a reason the page shows.
- [x] Admin site: `admin/src/app/(signed-in)/settings/page.tsx` and a "Settings" entry in `SECTIONS` in `site-menu.tsx`. The page is generic over the registry: each row has the value, an input for its type and allowed values (for `llm.key`, a select of the keys' names with their providers), and a save that asks for confirmation.
- [x] After a save, the row shows "applies at HH:MM:00" (the next minute), and "applied" once that time has passed.
- [x] The history lists who changed what, when, and the old and new value, newest first.
- [x] Any Administrator may change any setting; nothing depends on which Administrator.
- [x] Tests (ADR 0007): main-server integration tests for the routes (save, each refusal, history); admin tests for the "applies at" and "applied" labels and the confirmation.
- [x] The admin site's README names the "Settings" page.
- [ ] Screenshots of the page before and after a save, in the PR.
- [x] Each changed source file has its AI-generated row; lint, format, type checks and the touched tests pass in the main server and in the admin site.

## Comments

### Agent usage (2026-11-15)

- Agent time: about 45 minutes in one session (estimate).
- Tokens (estimate): input about 3.2M, of which about 3.0M cache reads and about 160k cache writes; output about 40k.
  No subagents.
- Screenshots of the page before and after a save are left to a person: the agent ran no browser.
- Deviations: a "wrong type" refusal is tested at the route as a body value that is not text (400), because the only
  registered setting is a STRING; the registry's unit test covers a wrong INTEGER or BOOLEAN value. Settings may now
  give a `label` for a value, which llm.key uses to name a key with its provider.
