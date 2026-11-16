# 03: Production's Secret carries the AI's keys by name

Parent: [A02 spec](../spec.md) ("Keys", "Steps only a person can do")
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

A Release reads every `/snunow/production/llm-key-<name>` parameter, through the call it already makes, and writes them into Secret `secrets` as one env line, `LLM_KEYS`, a JSON object of name to key (`{}` when there is none). The main server's pod gets it as an env var beside `OPENROUTER_API_KEY`, which stays as it is and is the key named `default`. No `llm-key-*` parameter is required. The deploy role already reads the parameters through its existing `GetParametersByPath` call on `/snunow/production`, so Terraform and IAM are not changed and the running servers still have no AWS access. main-server's `settings.ts` reads `LLM_KEYS` for ticket 02. The Dev Server may set an optional `LLM_KEYS` in its env file.

## Bring from A01

From `origin/3.0/A01-02-deployment-and-docs` (by hand: the branch is on 3.0/Main), adapted to named keys:

- The `write-secrets` line in `.github/release/release.sh` and its tests in `.github/release/test/release.bats`, as `LLM_KEYS` in place of `ANTHROPIC_API_KEY`.
- The key from `secrets` in `infra/production/k8s/parts/main-server/main-server.yaml`, and its check in `infra/production/k8s/test/targets.sh`. Not carried: `MODEL_PROVIDER` and `ANTHROPIC_MODEL` in `main-server.yaml` and `shared/kustomization.yaml`.
- The network policy's comment that names Anthropic beside OpenRouter (`infra/production/k8s/parts/main-server/network-policy.yaml`).
- The optional key line in `compose.deploy.yaml`, `infra/deploy/snu-now.env.example`, `infra/deploy/bootstrap.sh`, `infra/deploy/test/bootstrap.bats` and `infra/deploy/README.md`.
- The SSM step with `read -rs` and an empty-value guard in `infra/production/README.md`.

## Acceptance criteria

- [x] `release.sh write-secrets` writes `LLM_KEYS` from every `llm-key-<name>` parameter, sorted by name, `{}` when there is none, without printing a value. It refuses a name outside lowercase letters, digits and dashes, or `default`, and a value holding whitespace, a quote or a backslash, naming the parameter and never the value. `OPENROUTER_API_KEY` is unchanged. `release.bats` covers several keys, none, bad names, bad values, and no value printed.
- [x] `main-server.yaml` passes `LLM_KEYS` from `secrets` beside `OPENROUTER_API_KEY`; `targets.sh` covers both. The server's `ASSISTANT_MODEL` env entry is removed once ticket 02 stops reading it (left to ticket 02).
- [x] The network policy's comment names Anthropic; the policy itself is unchanged.
- [x] `main-server/src/common/settings.ts` reads `LLM_KEYS` (default `{}`, empty read as `{}`) as a record of name to non-empty key, refusing a name outside the pattern or `default`, and never repeating the text in a refusal. Nothing else reads it yet.
- [x] The Dev Server's files carry an optional `LLM_KEYS` (`{}`).
- [x] `infra/production/terraform/` is not changed: `deploy_role.tf` allows `ssm:GetParametersByPath` on `/snunow/production`, which returns every direct child.
- [x] `infra/production/README.md`, "The AI's keys": adding a key (`read -rs` and an empty-value guard, then a Release), removing one, and that switching keys on the Settings page needs no Release.
- [ ] **Person: put any keys, then release.** No key is required. To use one, 안진영 puts `/snunow/production/llm-key-<name>` as a SecureString (the command is in the PR and the README) and, after the merge, pushes a `main-server` or `all` Release; then `LLM_KEYS` is set in the pod (checked without printing it).
- [x] Each changed source file has its AI-generated row; `shellcheck`, the bats tests and the k8s target tests pass.

## Comments

### Agent usage (2026-11-15)

- Agent time: about 50 minutes, in one session (an estimate).
- Tokens (estimates): input about 3.1M, of which about 2.9M cache reads, about 170k cache writes and about 30k uncached; output about 45k. No subagents.
