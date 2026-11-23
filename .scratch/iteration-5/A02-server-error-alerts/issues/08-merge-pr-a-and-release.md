# 08: PR A is merged, and the main server and admin site are Released

Parent: [A02 spec](../spec.md)
Status: ready-for-human
Blocked by: 01, 02, 07

Native files: none. Releases: the main server and the admin site.

**The webhook URL is a secret.** It never goes into chat, a pull request, an issue, a commit, a document, a configuration file, a test or a screenshot. A person reads it with `read -rs` and keeps it only in their password manager. This ticket does not use it.

## What to do

1. Merge PR A (tickets 01 and 02) into `5.0/Main`.
2. Release the main server and the admin site from the reviewed commit, as the infra README's "Releases" describes.

## Done when

- [ ] `kubectl --namespace snunow logs --selector app=main-server --tail=20` shows one JSON line per entry, each with `level` and `message`.
- [ ] The Production admin site has the Log test page, and a press on info answers "Sent." and adds the test line to the main server's log.

## Comments
