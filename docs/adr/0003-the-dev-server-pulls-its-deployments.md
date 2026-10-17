---
status: accepted
---

# The Dev Server pulls its deployments from GitHub; nothing pushes to it

The course servers accept ssh only from the university's network, so a GitHub-hosted Actions runner cannot reach them, and the only Actions runner that could (a self-hosted one on the server or on a lab computer) needs permissions the team does not have on the course organisation and would run pull-request code from a public repository on the team's machine. The Dev Server therefore deploys itself: a systemd timer on the server fetches the `development` branch every minute and, when its tip has moved and that commit's CI has passed, rebuilds and restarts the system. GitHub holds no key to the server and the server holds no GitHub token; the repository is public, so reading it needs none.

We chose this over pushing from GitHub Actions through a lab computer on the university network, which adds a third machine that must stay on and a copy of the server's key, and over waiting for the servers to be opened to the outside, which may never happen. The same pull model is what GitOps tools (Argo CD, Flux) use, so a later move to Kubernetes replaces the timer with such a tool and keeps the model.

## Consequences

- A deployment appears up to a minute after CI finishes, and nothing of it shows in GitHub's Actions tab. The result is read on the server (`journalctl`) or at the Dev Server's status address.
- Pushing straight to `development` deploys it; the branch has no protection rule. A commit whose CI fails is skipped, not deployed.
- The production server, when it comes, follows the same model with tags in place of a branch.
