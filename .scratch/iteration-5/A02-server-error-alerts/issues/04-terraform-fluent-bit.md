# 04: Terraform installs Fluent Bit in a `logging` namespace, and the infra README says where warnings go

Parent: [A02 spec](../spec.md)
Status: ready-for-agent
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

- [ ] `terraform fmt -check` and `terraform validate` pass, locally (`terraform init -backend=false`) and in CI.
- [ ] Rendered with the chart's own templates (`helm template` at 0.58.3 with these values), the objects are:
  - one DaemonSet with image 5.1.5;
  - one read-only hostPath volume, `/var/log`;
  - memory request 32Mi and limit 64Mi;
  - the environment variable from `slack-webhooks`/`main-server`;
  - no ClusterRole or ClusterRoleBinding;
  - no mounted service account token;
  - a configuration holding the default `service` section and ticket 03's pipeline.

  (Checked locally; the PR summarizes it.)
- [ ] On the repository's local k3s cluster, installed into an unlabeled `logging` namespace with a stand-in Secret, the pod becomes ready and is still running five minutes later, with no restart. (Hand check; the stand-in value is not a real webhook.)
- [ ] The diff touches nothing under `snunow`'s manifests, the NetworkPolicies, `allowed-connections.txt`, the Release script or the deploy role.
- [ ] The infra README has the sections above.
- [ ] The new Terraform file carries the AI-generated box, drawn with `#`.

## Comments
