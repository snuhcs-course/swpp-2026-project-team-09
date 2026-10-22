---
status: accepted
---

# Production runs on EKS in AWS, and GitHub Actions pushes each Release to it

Production, the system that user testing, the beta test, and the final demo reach, runs on Amazon EKS in AWS's Seoul Region, and Terraform builds its infrastructure. A Release tag, which names one server or `all`, starts a GitHub Actions workflow that waits until every CI job has passed on the tagged commit, builds that target's images, pushes them to Amazon ECR, and applies the shared manifests and the target's own to the cluster. The workflow reaches AWS through GitHub's OpenID Connect provider and a role that trusts only this repository's `snunow/` tags, so no AWS key is stored in GitHub.

The Dev Server pulls its deployments (ADR 0003) because GitHub cannot reach the course servers, and it runs Docker Compose (ADR 0004) because they cannot run Kubernetes. Neither limit holds on AWS, so Production uses Kubernetes and a push. A push shows each deployment and its failure in the Actions tab, next to the checks that gated it, and keeps deployment machinery out of a cluster of two small nodes. EKS rather than Kubernetes on one instance means three things: AWS runs the control plane, EKS replaces a failed node by itself, and every team member and the workflow reach the cluster with their own AWS identity, which can be removed one at a time.

## Considered Options

- **Argo CD pulling from the repository.** ADR 0003 expected a pull-based tool on Kubernetes. Argo CD corrects drift and has a dashboard, but it runs inside the cluster, needs the workflow to commit each image tag back to the repository, and adds a tool to learn. The reason for pulling, a server that GitHub cannot reach, does not apply.
- **k3s on one EC2 instance.** It costs about $72 a month less, since it has no control-plane fee. But one instance failing stops everything, the team members share one administrator certificate, image pulls from ECR need a credential helper, and upgrades are the team's job.
- **Amazon ECS on Fargate.** It has no control-plane fee either, but it is not Kubernetes, and the team works with kubectl and Lens.
- **Compose on a course server.** The course's ingress serves one host name per server, over plain HTTP. Production needs HTTPS on its own domain, both for the admin site's Google sign-in and for the tokens and positions that Users send.

## Consequences

- Each server runs what the last Release that deployed it applied, so different servers may run different commits. A change made by hand with kubectl stays until a Release overwrites it.
- The workflow's role can push images, read Production's secret values from Parameter Store in the same account, and deploy to the cluster, but not change infrastructure. Infrastructure changes are applied with Terraform from a team member's laptop. GitHub holds neither an AWS key nor any of Production's secret values.
- The Application Load Balancer is created by the AWS Load Balancer Controller from the cluster's Ingress, outside Terraform. Before tearing the system down, delete the Ingress, or the load balancer is left behind and keeps billing.
- AWS bills Production by the hour, about $144 per 30 days, from team members' sign-up credits and then a card. Because Terraform holds the whole system except the secret values, which team members put in Parameter Store by hand, moving it to another team member's AWS account is a second `terraform apply` there, a copy of the secret values, and a database dump and restore.
