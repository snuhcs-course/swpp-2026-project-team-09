# 01: The Terraform base: state, network, image registries, deploy role, and budget

Parent: [A01 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)
Touches: `infra/production/terraform/` (new), the first section of `infra/production/README.md` (new), and one new job in the CI workflow. Not `infra/production/k8s/`, which ticket 04 owns.

## What to build

The one root Terraform configuration that tickets 02, 03, and 06 add to, holding everything that needs no cluster (spec: "Accounts and money", "Network", "Images and ECR", "The Release workflow" under AWS access, and "Terraform"):

- **Versions.** Terraform 1.11 or newer, the AWS provider v6, and `terraform-aws-modules/vpc` v6, pinned in the configuration, with the committed `.terraform.lock.hcl`.
- **State.** The S3 backend with `use_lockfile`. Account A's backend settings file is committed. The variables file, which names the team members' IAM users and the budget's addresses, is ignored by git; a committed example of it names nobody.
- **The network.** One VPC over zones `a` and `c` of `ap-northeast-2`: a public subnet in each, tagged for the load balancer controller and with `map_public_ip_on_launch`, and a database subnet in each with no route to the internet. No NAT gateway.
- **ECR.** Five private repositories, `main-server`, `socket-server`, `worker-server`, `match-server`, and `admin`, each with a lifecycle rule that keeps the newest 10 images.
- **The deploy role.** GitHub's OIDC provider and a role that trusts `token.actions.githubusercontent.com` with `aud` equal to `sts.amazonaws.com` and `sub` like `repo:snuhcs-course@139540821/swpp-2026-project-team-09@1374366029:ref:refs/tags/snunow-*`. It may get an ECR login token and describe and push images in the five repositories. Ticket 02 gives it its cluster rights.
- **The budget.** One cost budget that counts gross spend (`include_credit` off), from the first apply to 2026-12-31 without a monthly reset, with actual-cost alerts at $50, $100, $150, $200, $250, and $300 to the addresses in the variables file.
- **Outputs** for the repository variables known here: the Region, the role ARN, and the registry.
- **CI.** A `terraform` job runs `terraform fmt -check` and `terraform validate` after `terraform init -backend=false`, without AWS credentials, on every push.
- **The runbook's first section.** `infra/production/README.md` starts with the bootstrap that creates account A's state bucket once, and with how to init, plan, and apply in account A with its backend file and variables file, including keeping a copy of the variables file in the state bucket. Ticket 03 adds the database section, and ticket 07 the rest.

IAM users stay out of Terraform, so that no password or key lands in the state.

## Acceptance criteria

- [ ] `terraform fmt -check` and `terraform validate` pass locally without a backend or AWS credentials, and the `terraform` CI job runs them on every push.
- [ ] The VPC has the two public and two database subnets of the spec, the public ones tagged for the controller and giving instances a public IPv4 address, the database ones with no internet route, and no NAT gateway.
- [ ] The five ECR repositories exist, each keeping its newest 10 images.
- [ ] The deploy role's trust admits only the `aud` and `sub` above (`StringLike` on `sub`). Its policy allows `ecr:GetAuthorizationToken` and, on the five repositories only, the actions to describe and push images.
- [ ] The budget counts gross spend, does not reset monthly, keeps its start date on later applies, and alerts at each of the six amounts. If the API refuses six notifications on one budget (AWS's pages give five in some places and ten in others), two budgets over the same period carry them.
- [ ] No IAM user, password, or access key is in the configuration or its state.
- [ ] The variables file is ignored by git, and its committed example lists every variable with a placeholder that names nobody.
- [ ] The runbook's first section gives the bootstrap and the init, plan, and apply commands, naming the real backend file and variables.
- [ ] Every new `.tf` file starts with the `#` AI-generated box, and the CI workflow gets a new row (`CLAUDE.md`). The lock file and Markdown get none.
- [ ] When done, the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.
