# 09: The manifests split into a shared part and one part per server

Parent: [A01 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)
Touches: `infra/production/k8s/` except `database-setup.yaml`, and the `manifests` job in `.github/workflows/ci.yml`. Not the Release workflow (ticket 05), not the runbook (ticket 07), and not what the objects say: the Deployments, Services, settings, and Ingresses render as ticket 04 built them.

## What to build

Ticket 04's Kustomize base becomes a shared part and five server parts, so that a Release of one server applies only the shared objects and its own (spec: "Manifest layout" under "Workloads", and "The Release workflow"):

- **The shared part:** the `settings` ConfigMap and the `secrets` Secret that the generators make, the two Ingresses, and Redis's Deployment and Service.
- **A part per server:** the Deployment and Service of each of `main-server`, `socket-server`, `worker-server`, `match-server`, and `admin`.
- **Six targets.** `kubectl kustomize` renders each of them. A server's target renders the shared part and that server's part, and nothing else. `all` renders everything, the same objects as the base renders today. Kustomize refuses one object twice in a render, so `all` cannot simply list the five server targets, which each hold the shared part.
- **Images.** In each target, Kustomize sets the registry and tag of its servers' images (`kustomize edit set image`), so that ticket 05 sets the commit SHA on the target it deploys. `redis` stays `redis:8`.
- **Generated names.** The ConfigMap's and the Secret's names keep their content hash. Within a render, every reference uses the hashed name. The same inputs give the same names in every target, so the jobs of an `all` Release apply one ConfigMap and one Secret between them, not five of each.
- **The secrets folder.** The `secretGenerator` still reads its three files from one `secrets/` folder that git ignores. `## Comments` names its path and each target's folder for tickets 05 and 07.
- **The database Job** stays at `infra/production/k8s/database-setup.yaml`, outside every kustomization, so the runbook's commands for it do not change.
- **CI.** The `manifests` job writes the stand-in secrets and renders every target.

## Acceptance criteria

- [x] `kubectl kustomize` renders each of the six targets without error with stand-in secrets, locally and in CI's `manifests` job; a real secrets file still cannot be committed.
- [x] A server's target renders exactly the shared objects (the ConfigMap, the Secret, the two Ingresses, and Redis's Deployment and Service) and that server's Deployment and Service.
- [x] `all` renders the same objects as ticket 04's base rendered before the split, with the same stand-in secrets, compared as parsed objects.
- [x] Setting an image with Kustomize in a target changes that server's image in its render, every server's for `all`, and leaves `redis:8` as it is.
- [x] In every render, each `configMapKeyRef` and `secretKeyRef` names the ConfigMap or Secret of that render, and the ConfigMap and the Secret get the same names in every target from the same inputs.
- [x] Every render holds only namespaced objects in `snunow` (no Namespace or other cluster-wide object), since the deploy role's rights stop at the namespace.
- [x] The database Job is in no kustomization, and `secrets/` is ignored by git (`git check-ignore`).
- [x] The checks drive the render the way the cluster would receive it, as the objects that `kubectl kustomize` prints, parsed, never a file's text; `## Comments` says how each criterion was checked.
- [x] Every new or changed source file (the kustomizations, the manifests, and the CI workflow) carries the `#` AI-generated box with a row for this change (`CLAUDE.md`).
- [ ] When done, the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.

## Comments

### Built (2026-10-22)

- **Layout.** In `infra/production/k8s/`: the shared part in `parts/shared/` (its kustomization with the two
  generators, `redis.yaml`, and `ingress.yaml`); a part per server in `parts/<server>/` (a kustomization and the
  server's Deployment and Service, as ticket 04 wrote them); and the six targets in `targets/<target>/`, named as the
  Release tags name them: `main-server`, `socket-server`, `worker-server`, `match-server`, `admin`, and `all`. Each
  target sets `namespace: snunow` and lists the shared part and its servers' parts; `all` lists the shared part and all
  five server parts. `database-setup.yaml` stays where it was, in no kustomization.
- **Secrets folder.** The `secretGenerator` reads `infra/production/k8s/parts/shared/secrets/`, which
  `parts/shared/.gitignore` ignores: the same three files and keys as ticket 04. Every target reads it, so ticket 05
  writes all three files before it renders any target, even one server's.
- **Images.** No target declares `images`. `kustomize edit set image <server>=<registry>/<server>:<sha>` in a target's
  folder adds the field, which sets that server's image in the render; `redis:8` stays.
- **Generated names.** `settings-<hash>` and `secrets-<hash>`, unlabelled, as ticket 04 rendered them. The same inputs
  give the same names in every target, so the cleanup finds them by name.
- **Test.** `infra/production/k8s/test/targets.sh` (kubectl, jq, and rsync) copies the manifests without any
  `secrets/` folder into a temporary folder, writes stand-in secrets there, renders each target with `kubectl
  kustomize`, and checks the objects that kubectl parses from the render (an empty `kubectl patch --local` prints them
  as JSON). It reaches no cluster.
- **CI.** The `manifests` job runs the test. `actionlint` reports nothing on `ci.yml`.

### How each criterion was checked (2026-10-22)

- **Renders, and the secrets file.** The test renders all six targets, with kubectl v1.36.1 (Kustomize v5.8.1),
  from the working tree and from a clean clone of the commit. CI's first GitHub run of it comes with the push. The test
  runs `git check-ignore` on the three secrets files.
- **A server's objects.** The test compares each target's objects, by kind and name with the hash shown as a
  placeholder, with the list from this ticket: the six shared objects and the target's servers' Deployments and
  Services.
- **`all` against ticket 04's base.** Ticket 04's base from the branch before the split and `targets/all` were
  rendered with the same stand-ins, parsed to JSON, and sorted by kind and name: the 16 objects are identical, the
  generated names included. Each server target's objects are identical to the same objects in `all`.
- **Images.** The test adds to each target's kustomization the `images` field that `kustomize edit set image` writes,
  with a stand-in registry and tag, and checks every Deployment's image in the render: the target's servers carry the
  new image, and `redis` keeps `redis:8`.
- **References and names.** In each render, the names of the ConfigMap, the Secret, and every `configMapKeyRef` and
  `secretKeyRef` come to one ConfigMap name and one Secret name, and each server target's pair equals `all`'s.
- **Namespace and the database Job.** The test checks that every object of every render is in `snunow`. The object
  lists above hold only ConfigMaps, Secrets, Ingresses, Deployments, and Services, so no Namespace, no cluster-wide
  object, and no Job is rendered.
- **The checks can fail.** On a copy, each check failed on a matching change: a target without its namespace, a
  reference to another ConfigMap, generators without the hash, a renamed image, the database Job added to the shared
  part, a target that changes the settings, and a target with another server's part.
- **Boxes.** The new kustomizations and the test carry the box with this change's row. The moved manifests are
  unchanged and keep theirs; `ci.yml` and the shared kustomization already had today's row. The `.gitignore` has no
  box, like the repository's other `.gitignore` files.
