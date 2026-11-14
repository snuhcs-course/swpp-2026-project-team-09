# 03: Production's Secret carries the Anthropic key

Parent: [A02 spec](../spec.md) ("Keys", "Steps only a person can do")
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

A Release reads `/snunow/production/anthropic-api-key` like `openrouter-api-key` and writes `ANTHROPIC_API_KEY` into Secret `secrets`, and the main server's pod gets it as an env var. The deploy role already reads the parameter through its existing call on `/snunow/production`, so Terraform is not changed and the running servers still have no AWS access. The Dev Server may set an optional `ANTHROPIC_API_KEY` in its env file.

## Bring from A01

From `origin/3.0/A01-02-deployment-and-docs` (by hand: the branch is on 3.0/Main):

- The `anthropic-api-key` line in `.github/release/release.sh` and its tests in `.github/release/test/release.bats`.
- `ANTHROPIC_API_KEY` from `secrets` in `infra/production/k8s/parts/main-server/main-server.yaml`, and its check in `infra/production/k8s/test/targets.sh`. Not carried: `MODEL_PROVIDER` and `ANTHROPIC_MODEL` in `main-server.yaml` and `shared/kustomization.yaml`.
- The network policy's comment that names Anthropic beside OpenRouter (`infra/production/k8s/parts/main-server/network-policy.yaml`).
- The optional `ANTHROPIC_API_KEY` in `compose.deploy.yaml`, `infra/deploy/snu-now.env.example`, `infra/deploy/bootstrap.sh`, `infra/deploy/test/bootstrap.bats` and `infra/deploy/README.md`.

## Acceptance criteria

- [ ] `release.sh write-secrets` writes `ANTHROPIC_API_KEY` from `anthropic-api-key`, and `release.bats` covers it.
- [ ] `main-server.yaml` passes `ANTHROPIC_API_KEY` from `secrets`; `targets.sh` covers it. The server's `ASSISTANT_MODEL` env entry is removed once ticket 02 stops reading it.
- [ ] The network policy's comment names Anthropic; the policy itself is unchanged.
- [ ] The Dev Server's files carry an optional `ANTHROPIC_API_KEY`.
- [ ] `infra/production/terraform/` is not changed.
- [ ] `infra/production/README.md`: the SSM step for the Anthropic key (`read -rs` and an empty-value guard), and that a Release fails while the parameter is missing.
- [ ] **Person: put the key, then release.** A Release fails when a parameter it reads is missing, so before this ticket is merged, 안진영 puts `/snunow/production/anthropic-api-key` as a SecureString (a `!` command is given in the PR). After the merge, one main-server Release carries it, and `ANTHROPIC_API_KEY` is set in the pod (checked without printing it).
- [ ] Each changed source file has its AI-generated row; `shellcheck`, the bats tests and the k8s target tests pass.

## Comments
