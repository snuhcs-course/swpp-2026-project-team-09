# A03: Production's nodes have 40 GiB disks, so a Release's image pulls no longer put a node in DiskPressure

Status: ready-for-human (ticket 02, the apply, waits for a quiet time)

## Problem Statement

Production's two `t4g.small` nodes each have a 20 GiB root volume. Each node keeps the images of the pods it runs, and an `all` Release pulls the new images of four servers before the old ones are removed. On 2026-11-24 at 22:29 KST, during such a Release, node `ip-10-0-8-237` went into DiskPressure for five minutes, the fourth time in seven days. The kubelet evicted its Fluent Bit pod again and again until image garbage collection freed space, so warnings and errors from that node's pods did not reach `#team9-main-server-error` meanwhile. The app's pods kept running. Memory is not the cause: the nodes use 56–59% of it, and no container was OOM-killed.

The kubelet collects unused images every five minutes, once disk use is over 85%. EKS's Amazon Linux 2023 nodes evict pods once less than 10% of the disk is free. On 20 GiB that leaves about 1 GiB between the two, which four image pulls can cross before the next collection. On 40 GiB collection starts at about 34 GiB used, and 2 GiB separate it from eviction.

## Solution

- The launch template's `volume_size` in `infra/production/terraform/cluster.tf` goes from 20 to 40, still gp3 and encrypted. Nothing else about the nodes changes.
- Applying it replaces both nodes one after the other through a new launch template version. The infra README's "Replacing the nodes" says what the plan shows, the order EKS follows, what each pod does, and what to check afterwards.
- The apply is the account owner's, at a quiet time.

| # | Ticket | Status | Blocked by |
| --- | --- | --- | --- |
| 01 | [The nodes' disk is 40 GiB in Terraform, and the README says how such a change is applied](issues/01-disk-40gb-in-terraform.md) | done | None |
| 02 | [The account's owner applies it at a quiet time and checks the nodes and pods](issues/02-apply-at-a-quiet-time.md) | ready-for-human | 01 |

## Decisions

- 40 GiB, about 4 USD a month more for the two gp3 volumes.
- No kubelet image garbage-collection thresholds for now. Setting them on Amazon Linux 2023 takes a `NodeConfig` in the launch template's user data, which is more than one setting. If a node still reaches DiskPressure at 40 GiB, that is the next step.

## Out of Scope

- The node's instance type, the node count, and memory.
- A PodDisruptionBudget for the main and socket servers.
