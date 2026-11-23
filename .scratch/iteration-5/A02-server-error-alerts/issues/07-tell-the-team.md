# 07: The team hears about the Production changes before they are made

Parent: [A02 spec](../spec.md)
Status: ready-for-human
Blocked by: 01, 02, 03, 04

Native files: none. Releases: none.

**The webhook URL is a secret.** It never goes into chat, a pull request, an issue, a commit, a document, a configuration file, a test or a screenshot. A person reads it with `read -rs` and keeps it only in their password manager. The announcement links the pull requests and names the Secret, never its value.

## What to do

Before ticket 08 or 09 changes Production, tell the team, with links to PR A (tickets 01 and 02) and PR B (tickets 03 and 04):

- A main-server and admin site Release: the main server's logs in `kubectl logs` become JSON lines, and the admin site gains a Log test page.
- A `logging` namespace with one Fluent Bit pod on each node (18 of the 22 pod slots), installed by `terraform apply` from the account owner's laptop.
- A Secret, `slack-webhooks` in `logging`, made by hand.
- When each change happens, who makes it, and how to undo it: Fluent Bit goes with a `terraform destroy -target` on its release and namespace, and the log format goes back with `LOG_FORMAT` removed and a Release.

Both pull requests are reviewed and approved like any other, the infrastructure one included.

## Done when

- [ ] The announcement is posted where the team announces Production changes.
- [ ] PR A and PR B each have an approval.

## Comments
