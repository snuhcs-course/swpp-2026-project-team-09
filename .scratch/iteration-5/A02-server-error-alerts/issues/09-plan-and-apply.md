# 09: The account's owner plans and applies PR B's Terraform, in order

Parent: [A02 spec](../spec.md)
Status: done
Blocked by: 04, 05, 06, 07

Native files: none. Releases: none; this is a `terraform apply` from the account owner's laptop.

**The webhook URL is a secret.** It never goes into chat, a pull request, an issue, a commit, a document, a configuration file, a test or a screenshot. A person reads it with `read -rs` and keeps it only in their password manager. It goes into the Secret only, never into Terraform, so neither the plan nor the state holds it.

## What to do

1. Sign in to account A (`aws login`) and initialize with the state backend, as the infra README's "Init, plan, and apply" describes.
2. On PR B's branch, run `terraform plan`. It must add three resources (the `logging` namespace, its NetworkPolicy, and the Helm release) and change nothing else. Put its output in PR B's body.
3. Merge PR B into `5.0/Main` once it is approved.
4. On the merged commit, follow the order that ticket 04 wrote into the infra README's "First setup":
   1. `terraform apply -target` on the `logging` namespace;
   2. create the `slack-webhooks` Secret, its `main-server` key read with `read -rs`;
   3. a full `terraform apply`.

   Do not make the namespace by hand: Terraform would then fail to create it.

## Done when

- [x] PR B's body holds the plan's output, which adds the namespace, its NetworkPolicy, and the Helm release and changes nothing else.
- [x] The full apply ends without an error.

## Comments

- Done on 2026-11-23 by TaeHyun79 (the account's owner), from `.claude/worktrees/a02-09-apply` with the state backend.
- The first plan, at 038660db, failed to load the chart (`Chart.yaml file is missing`, ticket 04's Comments) and also showed four EKS add-on updates unrelated to PR B, since `cluster.tf` takes each add-on's newest build: vpc-cni v1.23.2-eksbuild.3 → v1.23.3-eksbuild.2, coredns v1.14.7-eksbuild.11 → .35, kube-proxy v1.37.0-eksbuild.22 → .39, metrics-server v0.9.0-eksbuild.13 → v0.9.1-eksbuild.2. `-target` could not leave them out, since `helm_release` depends on `module.eks`. They were announced and applied on their own first, from `5.0/Main` at 1e9eafcc (`0 added, 4 changed, 0 destroyed`); afterwards the four were `ACTIVE`, and every pod in `kube-system` and `snunow` was Running.
- fyoon46 merged PR #531 as e1f26483. On it: `terraform apply -target=kubernetes_namespace_v1.logging`, the Secret with the README's piped command, then the full apply, which added the NetworkPolicy and the Helm release. The plan in #531's body was taken after the namespace step, so it adds the other two of the three; the body says so.
- Right after the apply, the DaemonSet was 2/2 with one pod Running on each node and no restart, and no pod in the cluster was Pending.

### Agent usage (2026-11-23)

- No agent worked on this ticket by itself: the orchestrator's guidance and checks (commands, reading the results, `kubectl get` and `kubectl logs` after the owner signed in) are counted in the spec's table.
