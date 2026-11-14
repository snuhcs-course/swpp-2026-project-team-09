# 03: Keys put in Parameter Store reach the main server through a `keys` Release

Parent: [A02 spec](../spec.md) ("Keys", "The `keys` Release", "The deploy role's permission")
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

A person runs one script that puts a key under `/snunow/production/llm-keys/<name>` and pushes a `snunow/keys/YY.MM.DD-N` tag. The tag's Release copies the folder into a Secret `llm-keys`, mounted into the main server as one file per key, without a restart. The running servers get no AWS access. The existing `openrouter-api-key` keeps reaching the pod as `OPENROUTER_API_KEY` and is listed as `default`.

## Bring from A01

From `origin/3.0/A01-02-deployment-and-docs` (by hand): the network policy's comment that names Anthropic beside OpenRouter (`infra/production/k8s/parts/main-server/network-policy.yaml`), and the optional `ANTHROPIC_API_KEY` in `compose.deploy.yaml`, `infra/deploy/snu-now.env.example`, `infra/deploy/bootstrap.sh`, `infra/deploy/test/bootstrap.bats` and `infra/deploy/README.md`, so that the Dev Server can list `default-anthropic` if its env file has one. Not carried: A01's `anthropic-api-key` parameter and its line in `release.sh`, since keys now come from the folder.

## Acceptance criteria

- [ ] `.github/release/release.sh`: `keys` added to `TARGETS`; `check-name` prints, for a `keys` tag, no servers, no app, and `keys=true`. `all` does not include `keys`.
- [ ] `release.sh write-keys <folder>` reads `get-parameters-by-path` output on stdin, refuses a bad name (lowercase letters, digits, hyphens, at most 40), and writes one file per key plus `added.json` (name to `LastModifiedDate`), with `umask 077`. It prints no value.
- [ ] `.github/workflows/release.yml`: a `keys` job, when `keys=true`, that assumes the deploy role, runs `aws ssm get-parameters-by-path --path /snunow/production/llm-keys --with-decryption`, writes the files and applies them as Secret `llm-keys` (a fixed name, not a generated one) in the namespace. The `clean` step leaves `llm-keys` alone.
- [ ] `infra/production/terraform/deploy_role.tf`: the `SecretParameterPath` statement gets one more resource, `${local.secret_parameter_path_arn}/llm-keys`, with a comment that it is read-only and that the role can already read every parameter under `/snunow/production` by name. **If the reviewer chooses the alternative** (spec, "The deploy role's permission"), no Terraform changes: the Release reads `llm-key-names` from its existing call and fetches each key by name, and the script updates the list.
- [ ] `main-server.yaml` mounts Secret `llm-keys` read-only at `/var/run/llm-keys`, `optional: true`, with no `subPath` (so the kubelet refreshes the files). The server's `ASSISTANT_MODEL` env entry is removed once ticket 02 stops reading it.
- [ ] `infra/production/put-llm-key.sh <name>`: checks the name, reads the key with `read -rs`, refuses an empty value, puts it as a SecureString with `--overwrite`, then creates and pushes the next `snunow/keys/YY.MM.DD-N` tag. It never prints the key.
- [ ] Tests: `release.bats` for `check-name` with `keys` and for `write-keys` (files, names, `added.json`, no value printed); `infra/production/k8s/test/targets.sh` for the mount; a bats test of the script's checks with `aws` and `git` stubbed.
- [ ] `infra/production/README.md`: adding, replacing and removing a key with the script, the `keys` Release, and the Terraform step.
- [ ] **Person: terraform apply.** After merge, a person with the account's credentials runs `terraform apply` in `infra/production/terraform` and checks that the plan changes only the `release` policy of the deploy role. (With the alternative: creates `/snunow/production/llm-key-names` instead.)
- [ ] **Person: put a key and push a tag.** 안진영 runs the script once with the Anthropic key, and the Release's log shows the Secret applied. Once ticket 02 is released too, the pods list the key within about two minutes.
- [ ] Each changed source file has its AI-generated row; `shellcheck`, the bats tests and the k8s target tests pass.

## Comments
