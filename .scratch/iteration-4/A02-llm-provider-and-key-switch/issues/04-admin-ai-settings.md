# 04: The admin site's "AI settings" page lists, checks and switches keys

Parent: [A02 spec](../spec.md) ("The admin page "AI settings"", "The backup key")
Status: ready-for-agent
Blocked by: 01, 02, 03

## What to build

An Administrator opens "AI settings" in the admin site's menu and sees every key the server holds: name, provider, last 4 characters, added date, NEW, and which one is chosen and which is the backup. They run a health check on a key (a short reply, one tool call, and on Anthropic a cache read) and, once it passes, choose it as the key or as the backup. The page shows whether each change is "waiting" or "applied", the history of changes, and a warning when the chosen key keeps failing or was switched automatically.

## Acceptance criteria

- [ ] Main server, under `admin/ai-settings`, guarded like the other admin routes: the key list with the chosen and backup marks; the check of one key; saving `llm.key` and `llm.backupKey`; the history; the waiting/applied state and the copy's time; the warning (failure count and the last automatic switch). No route returns a key's value.
- [ ] The health check runs three calls through the key: a short reply, one forced tool call, and on Anthropic the same prompt twice with a breakpoint, the second reading the cache. It returns each call's result. A Prisma model `LlmKeyCheck` (name, the key's added date and last 4, passed, each call's result, Administrator, time) keeps it.
- [ ] Saving a key or a backup key is refused (409) unless the key is in the list with a known provider and has a passing check for its current value (same name, added date and last 4). The backup cannot be the chosen key. Saving writes the setting and its history row (ticket 01).
- [ ] Admin site: `admin/src/app/(signed-in)/ai-settings/page.tsx` and an "AI settings" entry in `SECTIONS` in `site-menu.tsx`. The key list is a table with NEW for a key added in the last 7 days. "Check" runs the check and shows each call's result. "Use this key" and "Set as backup" are disabled until a check passed, and ask for confirmation. Each setting shows "waiting" or "applied" with the copy's time. The history lists name, old and new value, who (or "automatic"), and when. The warning is a banner at the top.
- [ ] Any Administrator may do all of it; nothing depends on which Administrator.
- [ ] Tests (ADR 0007): main-server integration tests for the routes (no value in any answer, refusal of an unchecked key, of a stale check after the key's value changed, and of the backup equal to the key); a unit test of the health check's three calls through the scripted model; admin tests for the waiting/applied labels and the disabled buttons.
- [ ] The admin site's README section on its pages names "AI settings".
- [ ] Screenshots of the page with two keys, one checked and chosen, in the PR.
- [ ] Each changed source file has its AI-generated row; lint, format, type checks and the touched tests pass in the main server and in the admin site.

## Comments
