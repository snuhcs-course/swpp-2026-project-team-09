# 08: WebSocket through the course ingress

Parent: [P04-05 spec](../spec.md)
Status: ready-for-human
Owner: 김태현
Blocked by: 06

Starts after ticket 06 is done. Outside the scope of agent implementation.

## What to do

From a phone on a network outside the campus, keep the app's live connection open for more than three minutes with the app in the foreground and the socket server's log open on the server. Record in the runbook whether the ingress passes WebSocket connections at all, whether it ends them at 120 seconds, and whether the app's reconnection covers an ending without a visible gap. If connections are ended, draft a follow-up ticket: shorten socket.io's ping interval below the ingress's limit, or allow the polling transport in the app.

## Acceptance criteria

- [ ] The runbook's place for this finding holds the date, the network used, and the three answers.
- [ ] If connections were ended, a follow-up ticket exists in this folder with `Status: needs-triage`.
- [ ] The time it took is recorded under `## Comments`.
