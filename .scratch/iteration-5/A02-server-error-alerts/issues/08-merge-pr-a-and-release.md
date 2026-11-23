# 08: PR A is merged, and the main server and admin site are Released

Parent: [A02 spec](../spec.md)
Status: done
Blocked by: 01, 02, 07

Native files: none. Releases: the main server and the admin site.

**The webhook URL is a secret.** It never goes into chat, a pull request, an issue, a commit, a document, a configuration file, a test or a screenshot. A person reads it with `read -rs` and keeps it only in their password manager. This ticket does not use it.

## What to do

1. Merge PR A (tickets 01 and 02) into `5.0/Main`.
2. Release the main server and the admin site from the reviewed commit, as the infra README's "Releases" describes.

## Done when

- [x] `kubectl --namespace snunow logs --selector app=main-server --tail=20` shows one JSON line per entry, each with `level` and `message`.
- [x] The Production admin site has the Log test page, and a press on info answers "Sent." and adds the test line to the main server's log.

## Comments

- Done on 2026-11-23: fyoon46 merged PR #530 as 1e9eafcc, and `snunow/all/26.11.23-17` Released it (main server, admin site, socket and worker servers; the run's app job was separate).
- After the Release, the last 200 lines of each main-server pod were all JSON with `level` and `message` (400 of 400). A press on info on the Production Log test page answered "Sent." and added `{"level":"log",…,"message":"A test info line from the admin site, by Administrator <id>","context":"LogTestController"}` to the main server's log.

### Agent usage (2026-11-23)

- No agent worked on this ticket by itself: the orchestrator's guidance and checks (commands, reading the results, `kubectl get` and `kubectl logs` after the owner signed in) are counted in the spec's table.
