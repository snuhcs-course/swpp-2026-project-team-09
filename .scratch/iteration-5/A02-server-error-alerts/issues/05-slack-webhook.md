# 05: The Slack app and the webhook for #team9-main-server-error

Parent: [A02 spec](../spec.md)
Status: done
Blocked by: None (can start immediately)

Native files: none. Releases: none.

**The webhook URL is a secret.** It never goes into chat, a pull request, an issue, a commit, a document, a configuration file, a test or a screenshot. A person reads it with `read -rs` and keeps it only in their password manager.

## What to do

1. In Slack's app settings, create one app for the servers' logs (for example "SNU Now server logs") in the team's workspace, and turn on Incoming Webhooks.
2. Add a webhook for the private channel `#team9-main-server-error`. The person who adds it must be a member of that channel. The socket and worker servers' channels get their webhooks from this same app when they are connected, so no new app is needed (the free plan allows 10).
3. Save the URL in your password manager. Tickets 06 and 09 need it again.
4. Send a test post from a terminal:

   ```bash
   read -rs SLACK_WEBHOOK_MAIN_SERVER
   curl --silent --show-error --header 'Content-Type: application/json' \
     --data '{"text":"A test post from the terminal"}' "$SLACK_WEBHOOK_MAIN_SERVER"
   unset SLACK_WEBHOOK_MAIN_SERVER
   ```

## Done when

- [x] The test post appears in `#team9-main-server-error`.
- [x] The URL is in one place only: the password manager of the person who made it.

## Comments

- Done on 2026-11-23 by TaeHyun79: the Slack app "SNU Now server logs" with an Incoming Webhook for `#team9-main-server-error`. The terminal's test post appeared in the channel. The URL is in their password manager only; it reached no chat, file or session.

### Agent usage (2026-11-23)

- No agent worked on this ticket by itself: the orchestrator's guidance and checks (commands, reading the results, `kubectl get` and `kubectl logs` after the owner signed in) are counted in the spec's table.
