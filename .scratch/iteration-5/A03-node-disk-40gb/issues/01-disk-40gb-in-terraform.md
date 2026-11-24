# 01: The nodes' disk is 40 GiB in Terraform, and the README says how such a change is applied

Parent: [A03 spec](../spec.md)
Status: done
Blocked by: None

Native files: none. Releases: none; ticket 02 applies it.

## What to build

- `cluster.tf`: the node group's launch template sets `volume_size = 40` instead of 20, with a one-line comment saying why. The type stays gp3, encrypted, deleted with the instance; the instance type, the node count and everything else stay.
- The infra README: a "Replacing the nodes" section under Terraform, with what the plan shows, the order in which EKS replaces the nodes, what happens to each pod (the main and socket servers, the worker, the admin site, Redis, the load balancer controller, Fluent Bit, `coredns` and `metrics-server`), whether the 11-pod limit holds anything back, that Redis starts empty, and what to check afterwards. The Capacity section names the disk.

## Acceptance criteria

- [x] `terraform fmt -check` and `terraform validate` pass.
- [x] `terraform plan` against account A shows two resources changed in place and nothing added or destroyed: the launch template's `volume_size` 20 → 40, and the node group's `launch_template` `version` 1 → `(known after apply)`.
- [x] What the apply does is taken from EKS's "Understand each phase of node updates" and the AWS provider's `aws_eks_node_group` (a changed `launch_template` `version` is sent as `UpdateNodegroupVersion`, and the apply waits for it), not from memory.

## Comments

### Agent usage (2026-11-24)

One Claude Code session (Opus 5.5), no subagents.

- Agent time: about 0.3 hours, an estimate from the session's message times (gaps over 5 minutes left out), with the commit and the pull request added.
- Tokens: output 26,000; input 5,190,000, of which 5,080,000 cache reads, 108,000 cache writes and about 80 uncached. Figures are rounded and taken just before the commit.
