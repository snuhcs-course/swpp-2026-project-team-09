# 02: The cluster: nodes, add-ons, load balancer controller, namespace, and access

Parent: [A01 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01 (the root configuration, the VPC, and the deploy role)
Touches: `infra/production/terraform/` only.

## What to build

The EKS cluster joins ticket 01's configuration (spec: "Cluster", and the nodes' security group under "Network"), with `terraform-aws-modules/eks` v21 and the Helm provider:

- **The cluster.** A Kubernetes version under standard support, 1.36 or newer. A public API endpoint. Authentication by access entries. Control-plane logging and the module's KMS key turned off.
- **Nodes.** One managed node group of two on-demand nodes, one in each zone, on the ARM64 Amazon Linux 2023 AMI type with 20 GB root volumes and node auto repair on. The instance type is one variable, `t4g.small` by default; changing it replaces the node group, the new one created before the old one is deleted.
- **The nodes' security group** accepts traffic only from the load balancer, from the cluster, and from the other nodes.
- **Add-ons:** `vpc-cni`, `coredns`, `kube-proxy`, and `metrics-server`, and nothing else that puts a pod on every node.
- **The AWS Load Balancer Controller**, installed with one replica, its IAM role through IRSA.
- **The namespace** `snunow`, created by Terraform with the label `elbv2.k8s.aws/pod-readiness-gate-inject: enabled`, so the label is there before any pod.
- **Access entries.** Each IAM user in the variables file gets `AmazonEKSClusterAdminPolicy` on the cluster. The deploy role gets `AmazonEKSAdminPolicy` limited to the `snunow` namespace, and its IAM policy gains `eks:DescribeCluster` on this cluster.
- **Outputs:** the cluster name.

The steady state must fit the spec's pod budget on two `t4g.small` nodes (18 slots, 13 used, 16 during a Release), which is why the controller has one replica and EKS Pod Identity is not used.

## Acceptance criteria

- [ ] `terraform fmt -check` and `terraform validate` pass, locally and in the `terraform` CI job.
- [ ] The cluster's version is 1.36 or newer and under standard support, its endpoint is public, its authentication mode is access entries, and logging and the KMS key are off.
- [ ] The node group is as above, and raising the node size is a change to the one variable.
- [ ] The four add-ons are installed, and no Pod Identity agent or other per-node daemon is added.
- [ ] The controller runs one replica and reaches AWS through an IRSA role.
- [ ] The `snunow` namespace carries the readiness-gate label from its creation.
- [ ] Every IAM user in the variables file has a cluster-wide admin entry; the deploy role's entry is limited to `snunow`; adding or removing a team member is one change to the variables file.
- [ ] Every new or changed `.tf` file carries the `#` AI-generated box with a row for this change (`CLAUDE.md`).
- [ ] When done, the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.
