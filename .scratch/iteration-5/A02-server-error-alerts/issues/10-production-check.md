# 10: Warnings and errors from Production reach #team9-main-server-error

Parent: [A02 spec](../spec.md)
Status: ready-for-human
Blocked by: 08, 09

Native files: none. Releases: none.

**The webhook URL is a secret.** It never goes into chat, a pull request, an issue, a commit, a document, a configuration file, a test or a screenshot. A person reads it with `read -rs` and keeps it only in their password manager.

## What to do

1. `kubectl --namespace logging get pods`
2. `kubectl --namespace snunow get pods`
3. On the Production admin site's Log test page, press info, then warn, then error.

## Done when

- [ ] Two Fluent Bit pods are Running in `logging`, one on each node.
- [ ] No pod in `snunow` is Pending.
- [ ] The warn and error presses each give one post in `#team9-main-server-error`, naming `main-server` and the Administrator's ID; the info press gives none.
- [ ] A screenshot of the posts, which shows no URL, is under Comments, and the spec's Status becomes done.

## Comments
