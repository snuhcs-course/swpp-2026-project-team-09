# 07: The team hears about the Production changes before they are made

Parent: [A02 spec](../spec.md)
Status: done
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

- [x] The announcement is posted where the team announces Production changes.
- [x] PR A and PR B each have an approval.

## Comments

- Done on 2026-11-23: TaeHyun79 posted the announcement where the team announces Production changes, with both pull requests, the Release, the `logging` namespace and Fluent Bit's pods, the hand-made Secret `slack-webhooks` (never its value), who makes each change, and how to undo it.
- Approvals: PR #530 by Jaehyun0320, AhnJinYoung and fyoon46; PR #531 by Jaehyun0320.
- Ticket 09's first plan also showed four EKS add-on updates unrelated to PR B (`cluster.tf` takes each add-on's newest build). They were announced separately and applied before Fluent Bit (ticket 09).

### Agent usage (2026-11-23)

- No agent worked on this ticket by itself: the orchestrator's guidance and checks (commands, reading the results, `kubectl get` and `kubectl logs` after the owner signed in) are counted in the spec's table.
