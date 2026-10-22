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
- **The secrets folder.** The `secretGenerator` still reads its three files from one `secrets/` folder that git ignores. `## Comments` names its path for ticket 05.
- **The database Job** stays at `infra/production/k8s/database-setup.yaml`, outside every kustomization, so the runbook's commands for it do not change.
- **CI.** The `manifests` job writes the stand-in secrets and renders every target.

## Acceptance criteria

- [ ] `kubectl kustomize` renders each of the six targets without error with stand-in secrets, locally and in CI's `manifests` job; a real secrets file still cannot be committed.
- [ ] A server's target renders exactly the shared objects (the ConfigMap, the Secret, the two Ingresses, and Redis's Deployment and Service) and that server's Deployment and Service.
- [ ] `all` renders the same objects as ticket 04's base rendered before the split, with the same stand-in secrets, compared as parsed objects.
- [ ] Setting an image with Kustomize in a target changes that server's image in its render, every server's for `all`, and leaves `redis:8` as it is.
- [ ] In every render, each `configMapKeyRef` and `secretKeyRef` names the ConfigMap or Secret of that render, and the ConfigMap and the Secret get the same names in every target from the same inputs.
- [ ] Every render holds only namespaced objects in `snunow` (no Namespace or other cluster-wide object), since the deploy role's rights stop at the namespace.
- [ ] The database Job is in no kustomization, and `secrets/` is ignored by git (`git check-ignore`).
- [ ] The checks drive the render the way the cluster would receive it, as the objects that `kubectl kustomize` prints, parsed, never a file's text; `## Comments` says how each criterion was checked.
- [ ] Every new or changed source file (the kustomizations, the manifests, and the CI workflow) carries the `#` AI-generated box with a row for this change (`CLAUDE.md`).
- [ ] When done, the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.
