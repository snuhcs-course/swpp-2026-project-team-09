# 04: Terraform installs Fluent Bit in a `logging` namespace, and the infra README says where warnings go

Parent: [A02 spec](../spec.md)
Status: done
Blocked by: 03

PR: B. Native files: none. Releases: none; the account's owner applies it (ticket 09).

**The webhook URL is a secret.** No file, test, commit, pull request or issue holds it; tests and local checks use a stand-in value.

## What happens now

The cluster runs nothing that reads the nodes' logs. The `snunow` namespace forbids hostPath volumes, and the Release workflow's rights stop inside it, so Fluent Bit can go neither there nor through a Release.

## What to build

**One new Terraform file**, modelled on the load balancer controller's:

- A `logging` namespace with no Pod Security label. The Release workflow's deploy role gets no rights there, and it has no NetworkPolicy, so Fluent Bit reaches Slack.
- A `helm_release` of the official `fluent-bit` chart (repository `https://fluent.github.io/helm-charts`), pinned at 0.58.3, with the image tag 5.1.5. Its values:
  - keep the chart's default `service` section (the parsers file the JSON parser comes from, and the HTTP server and health check behind the probes);
  - replace the default inputs, filters and outputs with ticket 03's pipeline files, read from where they are;
  - no RBAC and no service account token;
  - one hostPath volume, `/var/log`, read-only, and no other;
  - memory request 32Mi and limit 64Mi, unless ticket 03's measurement says otherwise;
  - the environment variable `SLACK_WEBHOOK_MAIN_SERVER` from the `main-server` key of the Secret `slack-webhooks` in `logging`.
- No Secret in Terraform: a person makes it by hand, so its value stays out of the state.

**The infra README:**

- "Looking into a problem" names `#team9-main-server-error` and the admin site's Log test page.
- "Logs last as long as their pod" says that warn and error lines are also posted to Slack.
- A new section on server logs in Slack covers:
  - the pipeline;
  - the `slack-webhooks` Secret, one key per server;
  - replacing a webhook: replace the Secret and restart the DaemonSet, with no Release;
  - connecting another server: the spec's steps.
- "First setup" gains the first apply's order, with the commands:
  1. `terraform apply -target` on the namespace;
  2. the Secret, made with `kubectl create secret generic`, the value read with `read -rs`;
  3. a full apply.

  It says why: `helm_release` waits for ready pods, and a pod without its Secret never is. It also says why nobody makes the namespace by hand.
- "Changing Production" says the webhook is the one secret kept outside Parameter Store.
- "Capacity" counts the two Fluent Bit pods: 18 of the nodes' 22 pod slots.

`snunow`'s manifests, the NetworkPolicies, `allowed-connections.txt`, the Release script and the deploy role stay unchanged.

## Acceptance criteria

- [x] `terraform fmt -check` and `terraform validate` pass, locally (`terraform init -backend=false`) and in CI.
- [x] Rendered with the chart's own templates (`helm template` at 0.58.3 with these values), the objects are:
  - one DaemonSet with image 5.1.5;
  - one read-only hostPath volume, `/var/log`;
  - memory request 32Mi and limit 64Mi;
  - the environment variable from `slack-webhooks`/`main-server`;
  - no ClusterRole or ClusterRoleBinding;
  - no mounted service account token;
  - a configuration holding the default `service` section and ticket 03's pipeline.

  (Checked locally; the PR summarizes it.)
- [x] On the repository's local k3s cluster, installed into an unlabeled `logging` namespace with a stand-in Secret, the pod becomes ready and is still running five minutes later, with no restart. (Hand check; the stand-in value is not a real webhook.)
- [x] The diff touches nothing under `snunow`'s manifests, the NetworkPolicies, `allowed-connections.txt`, the Release script or the deploy role.
- [x] The infra README has the sections above.
- [x] The new Terraform file carries the AI-generated box, drawn with `#`.

## Comments

- Done in PR #531 (merged into `5.0/Main` as e1f26483 on 2026-11-23) and applied by ticket 09.
- **The chart's folder name.** `chart = "fluent-bit"` loaded the pipeline's folder, then named `fluent-bit/`, as a local chart (`Chart.yaml file is missing`): Helm tries a local path with the chart's name before the repository. The `helm template --repo` check had run from another folder, and `terraform validate` never loads the chart, so ticket 09's first plan found it. 14f362b4 renamed the folder `fluent-bit-pipeline/`, and `fluent_bit.tf` says why; `helm template` from inside `infra/production/terraform` then rendered the chart.
- **NetworkPolicy and security context** (fyoon46's 893f640d, from AhnJinYoung's review of #531): `logging` has a NetworkPolicy that takes no connection and lets Fluent Bit reach only DNS and TCP 443 to addresses outside the private ranges; the container has a read-only root filesystem, no capability and no privilege escalation; the README's Secret commands pipe the webhook in through stdin, so it is on no command line; and the README says how to take Fluent Bit out. This replaces the spec's "no NetworkPolicy" with a narrow one that still reaches Slack, so the apply adds three resources.
- `helm template` at 0.58.3 with the values as Terraform builds them: one ConfigMap, one Service on 2020 and one DaemonSet, nothing else. The DaemonSet runs `cr.fluentbit.io/fluent/fluent-bit:5.1.5` (the same digest as Docker Hub's, which the test runs) with only `/var/log` (read-only), 32Mi/64Mi, the Secret's env, `automountServiceAccountToken: false` and the security context. The rendered `[SERVICE]` equals `fluent-bit-pipeline/test/service.conf` apart from the chart's custom parsers file.
- k3s v1.36.5 hand checks: at 038660db, the pod was Running 5 minutes after `helm install --wait` with no restart; at 893f640d, applied from `fluent_bit.tf` in the README's three steps, the pod was Running 5 minutes later with no restart under the NetworkPolicy and with every capability dropped. It read a stand-in `main-server` pod's file (written by containerd, `root:root 640`), reached DNS, and was refused the private ranges and every port but 443. The README's webhook replacement and "Taking it out" commands were run as written there. Stand-in webhooks only.
- The infra README also gained "Moving to account B" step 2's three-step apply, and the Capacity count during an `all` Release (21 of 22 pods).
- `docs/adr/0006-production-runs-on-eks-and-releases-are-pushed.md` says every secret is in Parameter Store and that a move to another account is a second `terraform apply`; the Slack webhooks and the three-step apply are now exceptions. The ADR is left as it is.

### Agent usage (2026-11-23)

- Agent time: about 47 minutes, in session B after the go-ahead for ticket 04: ticket 04, its code review, the pull request, the chart folder's fix and the check of 893f640d on k3s. This is an estimate: the gaps under 5 minutes between transcript entries, summed, so waiting for a person is left out.
- Tokens: input 59,755,735 (cache reads 59,339,614, cache writes 415,755, uncached 366); output 174,057. Of these, two review subagents: input 2,968,618 (cache reads 2,758,166, cache writes 210,386, uncached 66); output 37,106.
