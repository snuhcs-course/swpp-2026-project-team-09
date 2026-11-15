# 05: A baseline on both providers, and the docs

Parent: [A02 spec](../spec.md) ("Deployment and documentation", "Testing Decisions")
Status: ready-for-agent
Blocked by: 01, 02, 03, 04

## What to build

The eval suites run once on the merged code, so that later work is measured against the paths production may use. The ADR, the glossary and the READMEs describe the global settings and how the AI's key, and with it the provider, is chosen.

## Bring from A01

- ADR 0013 from `origin/3.0/A01-02-deployment-and-docs` (`docs/adr/0013-the-assistant-calls-claude-through-the-anthropic-api.md`), rewritten for A02, and the line that marks ADR 0005 superseded on the provider only.
- The README and `main-server/README.md` changes of the same branch, as a starting point.
- `.scratch/iteration-3/A01-openrouter-to-claude-console/caching-experiment.md` from `origin/3.0/A01-04-caching-modes`, as the record of why `breakpoints` is the mode.

## Acceptance criteria

- [ ] **Person: cost approval.** Before any run, the ticket gives 안진영 an estimate per run (about USD 3.5 in all), and 안진영 approves it in writing in the PR or this file. No run starts before that.
- [ ] Runs on one commit of 4.0/Main after 01 to 04 are merged, from the local `.env` keys with `--provider`:
  - P19 (`pnpm eval`) and the P5 small world (`--world p5`) on OpenRouter and on Anthropic;
  - the P5 large world (`--world large-world-v1`), P6 (`--world p6`) and the collection evaluations A and B (`pnpm eval:collection`) on Anthropic only;
  - no P4.
- [ ] A record beside the last OpenRouter run of each suite: pass rate, cost per turn, cache hit rate, time per turn, provider, caching mode and commit, and each comparison stated as a different condition (metrics 4.3).
- [ ] ADR 0013: the Assistant, the Judgement and the same-event choice call Claude through the Anthropic API or OpenRouter, the key, and with it the provider, chosen by name on the admin site from the keys in Secret `secrets`; why (A01's three reasons, the switch without a Release); what was considered (A01's start-up setting, one key per provider, a Redis copy of the settings, keys managed on the admin site). ADR 0005 marked superseded on the provider only.
- [ ] `GLOSSARY.md`: the Administrator entry says an Administrator also changes global settings, such as the AI's key.
- [ ] Root README: the Assistant row of the stack table, the settings table, the AI-in-the-product paragraph and the external-services table (Anthropic beside OpenRouter).
- [ ] `infra/production/README.md`: checked against ticket 03's sections, with a short walk-through of switching to an Anthropic key: put `llm-key-<name>`, release, and choose it on the Settings page.
- [ ] Each changed source file has its AI-generated row (the Markdown files get none).

## Comments
