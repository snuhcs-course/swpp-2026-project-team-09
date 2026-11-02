# 02: Production reads the Anthropic key, and the docs say so

Parent: [A01 spec](../spec.md) ("Deployment", "Documentation")
Status: ready-for-agent
Blocked by: P06 and P07 merged into 3.0/Main

## What to build

A Release puts `ANTHROPIC_API_KEY` and `MODEL_PROVIDER` into production's settings, the main server may reach `api.anthropic.com`, and the docs describe the Anthropic path and why it replaced OpenRouter.

## Acceptance criteria

- [ ] `.github/release/release.sh` reads `/snunow/production/anthropic-api-key` like `openrouter-api-key` and writes `ANTHROPIC_API_KEY`; `shared/kustomization.yaml` carries `MODEL_PROVIDER=anthropic` and `ANTHROPIC_MODEL=claude-haiku-5-5` (`ASSISTANT_MODEL` stays for OpenRouter); `main-server.yaml` passes all three to the pod. The release tests (`release.bats`) and `infra/production/k8s/test/targets.sh` cover it. The OpenRouter parameter stays.
- [ ] The network policy already allows 443 to the internet and cannot name a host: only its comment changes, naming Anthropic beside OpenRouter.
- [ ] `compose.deploy.yaml`, `infra/deploy/snu-now.env.example`, `bootstrap.sh`, `bootstrap.bats` and `infra/deploy/README.md` carry the new settings.
- [ ] **Before the SSM step**, 안진영 rotates the Anthropic key that was pasted in the session chat; only the new key goes into SSM and the local `.env` files.
- [ ] `infra/production/README.md`: the SSM step for the Anthropic key (with `read -rs` and an empty-value guard), and the Judgement's credit note pointing at the Anthropic spend limit. A `!` command for 안진영 to write the parameter is given in the PR.
- [ ] ADR 0013 written; ADR 0005 marked superseded on the provider only.
- [ ] Root README (stack table, setup, settings table, AI-in-the-product paragraph, external-services table with Anthropic's terms) and `main-server/README.md` updated.
- [ ] After merge and the Release: production's Assistant answers one message, and the log names the Anthropic provider.
