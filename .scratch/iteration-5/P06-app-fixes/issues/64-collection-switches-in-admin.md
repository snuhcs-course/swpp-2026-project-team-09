# 64: Judgements, the same-event rules and extra.snu's Collections are switched on the admin site

Parent: [P06 spec](../spec.md)
Status: ready-for-human (built; waits for review)
Blocked by: None.

Native files: none. Releases: the main server and the worker server; no app update.

## What happens now

Asked by the user on 2026-11-28: "지금 ai 분류랑 중복제거 스위치가 있는 걸로 기억하는데 … 그걸 끄고 키는 거 어드민 사이트에서 가능함?", then "어드민에서 켜고 끌 수 있게 만들어줘" and "비교과 수집 스위치도 같이". Positions are as of `origin/5.0/Main` de01933b.

- Four switches decide what happens to collected posts, all env settings, all `off` in Production (`infra/production/k8s/parts/shared/kustomization.yaml`):
  - `AUTOMATIC_JUDGEMENT`, the AI 분류 of Drafts the rules left;
  - `SAME_EVENT_TITLE_RULE`, the 중복제거 rule of an equal title and start;
  - `SAME_EVENT_AI_CHOICE`, the 중복제거 AI choice among candidates;
  - `EXTRA_SNU_COLLECTION`, the worker's, whether its schedule collects extra.snu (비교과).
- The main server read its three once at start (`PublicationStepService`, `SameEventChoicesService`), and the worker its one in `ExtraSnuCollector`'s constructor. Turning one on took a merge and a Release; turning one off at once took a ConfigMap patch and a restart (`infra/production/README.md`).
- The admin site's Settings page changes global settings without a Release (A02), but only `llm.key` was registered.

## What to build

- Four `BOOLEAN` global settings, labelled on and off: `judgement.automatic`, `sameEvent.titleRule`, `sameEvent.aiChoice` and `collection.extraSnu`. Each defaults to its env setting, so a server with nothing saved behaves as before; a saved value wins over it, also across Releases.
- The two that call the model refuse on when the server holds no AI key, as the env settings refuse to start.
- The step after a Collection reads its switches once at the start of each entry point (`StepSwitchesService`), so a change applies from the next run and never halfway through one.
- `EXTRA_SNU_COLLECTION` moves to the main server, as the default of `collection.extraSnu`. Before each scheduled Collection the worker asks `POST /collections/scheduled` with `{ "source": "extra_snu" }`, answered `{ "scheduled": boolean }`; any other Source is always scheduled. A main server that does not answer starts none. `node dist/collect extra_snu` does not ask, as before.
- The admin site needs no change: its Settings page already shows a `BOOLEAN` setting with allowed values as a select, with the confirmation and the history.
- The READMEs and `infra/production/README.md` say the switches are turned on and off on the Settings page, and that a ConfigMap patch no longer changes a saved one.

## Must not break

- A server, test or evaluation with no saved row: each switch is its env setting (`eval/collection/run.ts` sets them by env).
- The step's behaviour with each switch on or off: tests `same-event*`, `judgement*`, `publication-step` (main server, `.integration`).
- The Settings page's list and saves: `admin-settings` (main server, `.integration`), `settings` (admin, `.integration`).
- extra.snu's Collections and the command: `extra-snu-collector` (worker, `.integration`).

## Acceptance criteria

- [x] An Administrator's save of `sameEvent.titleRule` and `judgement.automatic` on `/admin/settings` turns the title rule and Judgements on and off while the server runs, with the env settings off (main server `step-switches.integration.test.ts`; run by fyoon46 on a local merge with `5.0/Main`, 4/4).
- [x] `POST /collections/scheduled` answers `collection.extraSnu` for extra.snu and true for another Source, and refuses an unknown Source (same file).
- [x] The four settings are registered after `llm.key` with their env defaults and on/off labels, and the AI ones refuse on without a key (`step-switch-settings.unit.test.ts`, run locally: 6 passed).
- [x] The worker's schedule asks first, starts nothing when off or when the main server is down, and starts a Collection when on (`extra-snu-collector.integration.test.ts`, run locally: 31 passed with `settings.unit`).
- [x] `EXTRA_SNU_COLLECTION` is a main server setting (`settings-extra-snu.unit.test.ts`, run locally: 6 passed), read in Production from the same ConfigMap key by the main server's pod.
- [x] No native file changes; lint (type-aware), tsc and format pass on the changed files. The PR's CI runs no main server integration tests; fyoon46 ran the affected files in review (all passed), and Main's push run runs them.
- [ ] After the Release: the Settings page lists the four switches, all off, and a save of one shows "applies at HH:MM:00".

## Comments

### Agent usage (2026-11-28)

- Agent time: about 25 minutes in one session, from the user's first question to the pull request, measured from its transcript (an estimate). Pauses longer than five minutes are not counted.
- Tokens: output 83k; input 20.1M, of which 19.8M cache reads, 238k cache writes and 240 uncached. No subagents.
