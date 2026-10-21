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
- [x] The cluster's version is 1.36 or newer and under standard support, its endpoint is public, its authentication mode is access entries, and logging and the KMS key are off.
- [x] The node group is as above, and raising the node size is a change to the one variable.
- [x] The four add-ons are installed, and no Pod Identity agent or other per-node daemon is added.
- [x] The controller runs one replica and reaches AWS through an IRSA role.
- [x] The `snunow` namespace carries the readiness-gate label from its creation.
- [x] Every IAM user in the variables file has a cluster-wide admin entry; the deploy role's entry is limited to `snunow`; adding or removing a team member is one change to the variables file.
- [x] Every new or changed `.tf` file carries the `#` AI-generated box with a row for this change (`CLAUDE.md`).
- [ ] When done, the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.

## Comments

- **Kubernetes 1.37**, under standard support until 2027-12-01, with the upgrade policy `STANDARD`. No AWS page lists the `metrics-server` community add-on's versions for 1.37. Before the first apply, `aws eks describe-addon-versions --addon-name metrics-server --kubernetes-version 1.37` must list one; if it lists none, `kubernetes_version` in `cluster.tf` becomes `"1.36"`. A plan without that version fails at the module's version lookup, before anything is created.
- **Checks.** `terraform fmt -check`, `terraform init -backend=false -lockfile=readonly`, and `terraform validate` pass with Terraform 1.16.6. The CI job's same three steps pass in the `hashicorp/terraform:1.16.6` image on `linux/amd64`. The job itself runs once the branch is pushed. The lock file holds all seven providers for five platforms.
- **The controller's values.** `helm template` of chart 3.6.0 with the release's values renders one replica, the IRSA role annotation on the service account `kube-system/aws-load-balancer-controller`, the IngressClass `alb` that the Ingresses name, and no Service mutator webhook.
- **Team members.** Their entries come from `data.aws_iam_user`, so a name in the variables file without an IAM user fails the plan. Whoever applies must be in the list, because the module never adds the applying identity, and needs the AWS CLI on the PATH, which the Helm and Kubernetes providers run for their token.
- **Changing the instance type** runs four nodes for a few minutes while the new node group replaces the old one, which the quota check before the first apply covers.
