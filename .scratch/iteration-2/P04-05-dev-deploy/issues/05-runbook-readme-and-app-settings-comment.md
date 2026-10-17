# 05: The runbook, the README's Deployment section, and the app's example settings

Parent: [P04-05 spec](../spec.md)
Status: ready-for-agent
Blocked by: 02, 03, 04 (the names and commands the runbook describes)
Touches: the deploy folder's README, the root README, and the mobile app's example settings file.

## What to build

A teammate with ssh and no memory of this spec can run the Dev Server from the runbook alone: first setup with the bootstrap; filling the two kinds of settings and where the person-held values come from; reading the status address and the journal; redeploying by hand; restoring a dump; emptying the data and starting again; adding an APK; backing the settings up before the course deletes the servers; what changes for a production server on A. The root README gains a short "Deployment" section that says what the Dev Server is, its address, and points to the runbook. The app's example settings file gains a comment with the Dev Server's main-server and socket-server addresses, so a teammate copies two lines to build against it.

## Acceptance criteria

- [ ] The runbook has a section for each item of the spec's "Repository additions" runbook list, and every command in it names the real scripts, units and folders of tickets 02 to 04.
- [ ] The runbook records what is not covered by tests and is checked in the operations tickets (spec: "Testing Decisions", last item), with a place for ticket 08's finding about WebSockets.
- [ ] The root README's "Deployment" section is under a screen long, names the Dev Server's address and links to the runbook; the README's table of contents or heading structure stays consistent.
- [ ] The app's example settings file carries the Dev Server's two addresses as a comment beside the two variables, and the mobile project's `pnpm format:check` still passes.
- [ ] Markdown files get no AI-generated box; the example settings file gets a new row in its box if it has one (`CLAUDE.md`).
- [ ] When done, the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.
