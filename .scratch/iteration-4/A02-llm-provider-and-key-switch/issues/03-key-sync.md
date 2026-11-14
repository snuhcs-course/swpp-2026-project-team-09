# 03: Keys put in Parameter Store reach the main server through a `keys` Release

Parent: [A02 spec](../spec.md) ("Keys", "The `keys` Release", "The deploy role's permission")
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

A person runs one script that puts a key under `/snunow/production/llm-keys/<name>`, adds its name to `/snunow/production/llm-key-names`, and pushes a `snunow/keys/YY.MM.DD-N` tag. The tag's Release reads the list, fetches each key by its exact name and copies them into a Secret `llm-keys`, mounted into the main server as one file per key, without a restart. Terraform and the deploy role are not changed, and the running servers get no AWS access. The existing `openrouter-api-key` keeps reaching the pod as `OPENROUTER_API_KEY` and is listed as `default`.

## Bring from A01

From `origin/3.0/A01-02-deployment-and-docs` (by hand): the network policy's comment that names Anthropic beside OpenRouter (`infra/production/k8s/parts/main-server/network-policy.yaml`), and the optional `ANTHROPIC_API_KEY` in `compose.deploy.yaml`, `infra/deploy/snu-now.env.example`, `infra/deploy/bootstrap.sh`, `infra/deploy/test/bootstrap.bats` and `infra/deploy/README.md`, so that the Dev Server can list `default-anthropic` if its env file has one. Not carried: A01's `anthropic-api-key` parameter and its line in `release.sh`, since keys now come from the folder.

## Acceptance criteria

- [ ] `.github/release/release.sh`: `keys` added to `TARGETS`; `check-name` prints, for a `keys` tag, no servers, no app, and `keys=true`. `all` does not include `keys`.
- [ ] `release.sh write-keys <folder>` takes the names from `llm-key-names` and the `get-parameters` output, refuses a bad name (lowercase letters, digits, hyphens, at most 40), and writes one file per key plus `added.json` (name to `LastModifiedDate`), with `umask 077`. It prints no value.
- [ ] When the list names a key that is not in Parameter Store (`InvalidParameters` in the answer), the Release fails before it writes or applies anything, and its log names the missing key. An empty list is allowed and empties the Secret.
- [ ] `.github/workflows/release.yml`: a `keys` job, when `keys=true`, that assumes the deploy role, reads `llm-key-names` from `aws ssm get-parameters-by-path --path /snunow/production` (the call and permission the other Releases already use), fetches the named keys with `aws ssm get-parameters --names … --with-decryption` (at most 10 per call), writes the files and applies them as Secret `llm-keys` (a fixed name, not a generated one) in the namespace. The `clean` step leaves `llm-keys` alone.
- [ ] `infra/production/terraform/deploy_role.tf` is not changed. The role's existing `GetParametersByPath` on `/snunow/production` and `GetParameters` on `/snunow/production/*` cover the list and each key.
- [ ] `main-server.yaml` mounts Secret `llm-keys` read-only at `/var/run/llm-keys`, `optional: true`, with no `subPath` (so the kubelet refreshes the files). The server's `ASSISTANT_MODEL` env entry is removed once ticket 02 stops reading it.
- [ ] `infra/production/put-llm-key.sh <name>` does three things: checks the name, reads the key with `read -rs`, refuses an empty value and puts it as a SecureString with `--overwrite`; adds the name to `llm-key-names` (creating the StringList the first time, never adding a name twice); and creates and pushes the next `snunow/keys/YY.MM.DD-N` tag. `--remove <name>` takes the name off the list, then deletes the parameter, then pushes the tag. It never prints the key.
- [ ] Tests: `release.bats` for `check-name` with `keys` and for `write-keys` (files, names, `added.json`, no value printed); `infra/production/k8s/test/targets.sh` for the mount; a bats test of the script's checks and of the list kept in step (add, add again, remove) with `aws` and `git` stubbed; a test that a list naming a missing key fails before anything is written.
- [ ] `infra/production/README.md`: adding, replacing and removing a key with the script, `llm-key-names`, the `keys` Release, and what a failed Release for a missing key means.
- [ ] **Person: put a key and push a tag.** 안진영 runs the script once with the Anthropic key, and the Release's log shows the Secret applied. Once ticket 02 is released too, the pods list the key within about two minutes.
- [ ] Each changed source file has its AI-generated row; `shellcheck`, the bats tests and the k8s target tests pass.

## Comments
