# 07: The runbook, the tool guide, and the README changes

Parent: [spec](../spec.md)
Status: ready-for-agent
Blocked by: 01, 02, 03, 04, 05, 06 (the names and commands the runbook describes)
Touches: `infra/production/README.md` (beyond ticket 01's and ticket 03's sections), the root `README.md`, and `admin/README.md`.

## What to build

A team member with an IAM user and no memory of the spec can set up their laptop and run Production from the runbook alone (spec: "Access and tools", "Moving to account B", "Production APK", and "Repository additions"):

- **The tool guide.** Installing the AWS CLI v2 from AWS's installer and kubectl, kubectx and kubens, k9s, Terraform, and Freelens from Homebrew or winget, on macOS and Windows. Signing in with `aws login` (AWS CLI 2.32 or newer), and how Terraform then gets the session, as ticket 03 found. `aws eks update-kubeconfig` with the context alias `snunow-production`, switching to it with kubectx, and `snunow` as its namespace with kubens. Opening it in Freelens, with Lens Personal as the alternative that needs a Lens ID. Reading logs, restarting a Deployment, and forwarding a port. kubectl kept within one minor version of the cluster.
- **The rules** for changing Production, as the spec lists them, and adding or removing a team member.
- **Logs** last only as long as their pod, so a tester's report is looked into the same day.
- **First setup**, in order: what ticket 03 did; the repository variables from `terraform output`; the `PRODUCTION_` secrets with Production's own values (`openssl rand` for the tokens and passwords, `openssl genpkey` for the ES256 key pair, stored as PEM with real line breaks); the settings made by hand once in Google's and Kakao's consoles; the first Release; the second apply with the records variable on; each Source's collection run once by hand in the worker pod.
- **Releases.** Naming and tagging a reviewed commit of the iteration branch; following the run in the Actions tab; fixing a bad Release with a new one; deploying an earlier Release again from the Actions tab, never across a migration; rotating a secret by updating it and deploying the current Release again.
- **Capacity.** Reading `kubectl top`, and raising the memory settings or the node size.
- **The Production APK**, built by hand with both server addresses set to `https://api.snunow.com` and debug signing, named after the Release, and attached to that Release's GitHub release page, or the last APK linked when only the servers changed.
- **Moving to account B**, the spec's seven steps with the real commands.
- **Tearing down:** delete the Ingress before `terraform destroy`, or the ALB is left behind and keeps billing.
- **What CI does not cover**, with ticket 08 as where each item is checked.
- **The root README:** a Production paragraph in the Deployment section that points to the runbook; `infra/` and `.github/` in the Repository layout; the admin site's address in the limitations.
- **`admin/README.md`:** `https://admin.snunow.com` among the origins it lists.

Route 53 alias records have no TTL of their own; they answer with the ALB's 60 seconds. So step 3 of the spec's move, lowering the records' TTL to 60 seconds a few days ahead, has nothing to change for `api` and `admin`. The runbook confirms this against AWS's documentation and says so in place of that step.

## Acceptance criteria

- [ ] Every command in the runbook names the real files, variables, outputs, repository variables, secrets, workflow, and Job of tickets 01 to 06, checked against the code.
- [ ] The tool guide covers each item above for both macOS and Windows, and states how Terraform reads the `aws login` session.
- [ ] The move section has the spec's seven steps in order, with the TTL step handled as above, and says Users stay signed in and Redis starts empty.
- [ ] The root README's changes and `admin/README.md`'s origin are in place, and the README's table of contents stays consistent.
- [ ] Markdown files get no AI-generated box (`CLAUDE.md`).
- [ ] When done, the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.
