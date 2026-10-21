# Running SNU Now on AWS: facts and prices

All sources were accessed on 2026-10-21 or 2026-10-22. Prices are in USD, on-demand, in Seoul (`ap-northeast-2`). Thirty days count as 720 hours. `[S1]`-style links point to the Sources list at the end.

This note holds only the facts. The design built on them is in `.scratch/iteration-3/aws-production/spec.md`, and ADR 0006 records why.

## 1. AWS accounts and credits

**Credits**
- $100 at sign-up, plus up to $100 for five activities [S1][S4]:
  - launch an EC2 instance;
  - use the Bedrock playground;
  - create a budget;
  - build a Lambda web app;
  - create an RDS database.
- Activities can be done on either plan.
- **Expiry.** The Free Tier Terms say credits expire 12 months after the account is created. The FAQ says 6 months for the newest sign-up flow [S1][S6]. Either way they last past 12/14.

**What credits cannot do**
- Move to another account [S1].
- Be pooled. A Free-plan account that joins AWS Organizations moves to the Paid plan and can no longer use or earn Free Tier credits [S2][S6]. An organization also benefits from one account's Free Tier offers only [S6].
- Pay for Marketplace, Route 53 domain registration and transfer, upfront Savings Plan and Reserved Instance fees, support plans, or taxes [S5]. Everything else the design uses is covered. The Billing console's Credits page lists each credit's applicable products.

**Free plan and Paid plan**
- **What happens at the end of the Free plan.** It ends after 6 months or when the credits run out, whichever comes first. The account is then suspended, and its data is erased after 90 days unless it moves to the Paid plan [S1][S2].
- **Instance types.** The free-tier types are `t3.micro`, `t3.small`, `t4g.micro`, `t4g.small`, `c7i-flex.large`, and `m7i-flex.large` [S3].
  - AWS customers report that other types, EKS node groups included, are refused on the Free plan. AWS documents do not say so.
  - No AWS page says whether EKS works on the Free plan.
- **Moving to the Paid plan.** The account keeps the remaining credits and bills a card beyond them. It cannot go back to the Free plan [S1][S2].

**The newer sign-up flow can pin an account to Sydney**
- Since 2026-09-16, some new customers sign up through "Sign up for AWS (new)". It ties the Region to the contact address's country, and South Korea gets Sydney (`ap-southeast-2`) [S7].
- Such an account reaches Seoul only on the Paid plan with "Activate advanced features", which is permanent and removes spend limits [S8].
- "Sign up for AWS (advanced)" lets the Region be chosen from the start.

| | New flow | Advanced flow |
|---|---|---|
| Sign-in | AWS Builder ID (Google, GitHub, and others) | Root user email and password |
| Console | No Region selector | Region selector |

**T4g free trial**
- 750 hours a month of `t4g.small` until 2026-12-31, pooled across Regions, for each account [S9].
- It applies on the Paid plan. Whether it applies on the Free plan is not documented.
- It covers EC2 hours only, not the EKS fee, EBS, or IPv4.
- EKS bills nodes as ordinary EC2 instances, so it is expected to cover a `t4g.small` node. No page says so outright.

**More than one account.** The Free Tier Terms deny a person credits for more than one account [S6]. Here each account belongs to a different team member.

## 2. Prices

| Item | Price |
|---|---|
| EKS control plane, standard support | $0.10/h ($72 / 30 d). Extended support $0.60/h. No free tier or discount [S10] |
| EC2 `t4g.small` / `t4g.medium` / `t4g.large` | $0.0208 / $0.0416 / $0.0832 per hour |
| Public IPv4, each (node, Elastic IP, each load balancer AZ) | $0.005/h ($3.60 / 30 d), in use or idle [S11] |
| NAT Gateway | $0.059/h + $0.059/GB |
| ALB | $0.0225/h + $0.008 per LCU-hour; at least two AZs, one public IPv4 per AZ [S21] |
| NLB | $0.0225/h + $0.006 per NLCU-hour; one AZ is allowed |
| EBS gp3 | $0.0912 per GB-month |
| ECR private storage | $0.10 per GB-month; pulls within the Region are free [S12] |
| RDS PostgreSQL `db.t4g.micro`, Single-AZ | $0.025/h + gp3 at $0.131 per GB-month |
| Data between AZs in the Region | $0.01/GB in each direction; ALB to targets over private IPs is free [S22] |
| Data out to the internet | 100 GB/month free, then $0.126/GB |
| Route 53 hosted zone | $0.50 a month [S23] |
| AWS Budgets / Cost Anomaly Detection | free for the first two action-enabled budgets / free |

Max pods per node with the VPC CNI and no prefix delegation are 11 for `*.small` and 17 for `*.medium` [S13].

## 3. Estimates

The design as specified costs about $144 per 30 days, with the T4g free trial covering one node:
- EKS $72.00.
- Two `t4g.small` nodes at $14.98, or $29.95 without the trial, plus their two public IPv4 addresses at $7.20.
- Two 20 GB root volumes at $3.65.
- The ALB and its two IPv4 addresses at $23.40, plus about $1 of capacity units.
- RDS `db.t4g.micro` with 20 GB at $20.62.
- ECR and the hosted zone at about $1.

The same with two `t4g.medium` nodes is about $189.

Alternatives, per 30 days, compared with the parts of the design they replace:

| Alternative | Its cost | What it replaces | Difference |
|---|---|---|---|
| k3s on one `t4g.medium` with an Elastic IP and 30 GB | $36 | EKS and the nodes with their IPv4, about $94 | about $58 less, no control-plane fee |
| NLB in one AZ, with Caddy in the cluster | about $20 | the ALB | about $5 less |
| PostgreSQL in the cluster on 20 GB of EBS | about $2 | RDS | about $19 less |
| NAT Gateway with private nodes | +$46 | – | more |
| EKS on Fargate, 9 to 11 pods, with the NAT it needs | about $171 | the nodes with their IPv4, about $22 | about $149 more; EKS Fargate has no arm64, adds 256 MB to every pod, and needs private subnets [S24] |
| Aurora Serverless v2 at its 0.5 ACU floor | about $75 | RDS at $21 | about 3.6 times; it never pauses while a connection is open [S25] |
| ElastiCache Serverless Valkey, minimum | about $7 | Redis as a pod at $0 | more |
| ECS on Fargate, arm64, 7 tasks with public IPs | about $82 | EKS and the nodes with their IPv4, about $94 | about $12 less, but not Kubernetes [S26] |

## 4. GitHub

- **Roles.** Maintain can create repository Actions secrets and variables [S14].
- **Environments.** Creating environments and environment secrets, and setting their protection rules, needs admin [S15]. A job that names a missing environment creates it, with no protection.
- **OIDC subject claims.** This repository uses immutable subject claims, with the prefix `repo:snuhcs-course@139540821/swpp-2026-project-team-09@1374366029` [S16].
- **A role that trusts Release tags:**
  - `token.actions.githubusercontent.com:aud` equals `sts.amazonaws.com`;
  - `token.actions.githubusercontent.com:sub` is `StringLike` with `<prefix>:ref:refs/tags/snunow-*`.
  - The tag form is derived from the prefix, and the first real token confirms it.
  - A job that declares `environment:` gets `<prefix>:environment:<name>` instead.
- **Actions versions.** `aws-actions/configure-aws-credentials@v6` and `aws-actions/amazon-ecr-login@v2`.

## 5. Terraform and EKS

- **Versions.** Terraform 1.16, the AWS provider v6, `terraform-aws-modules/eks` v21, and `terraform-aws-modules/vpc` v6.
- **State locking.** The S3 backend locks with `use_lockfile`, generally available since Terraform 1.11. DynamoDB locking is deprecated [S17].
- **Cluster access.** EKS access entries are the recommended way, and the `aws-auth` ConfigMap is legacy [S18]. Each team member runs `aws eks update-kubeconfig` with their own IAM identity.
- **Kubernetes version.** The newest version on EKS is 1.37, and standard support lasts 14 months [S19]. Version 1.34 leaves standard support on 2026-12-02.
- **Load balancers.**
  - Without the AWS Load Balancer Controller, a `type: LoadBalancer` Service creates a Classic Load Balancer, or an NLB with an annotation. This built-in controller receives critical fixes only [S20].
  - An Ingress needs the controller, which creates an ALB.
- **Availability Zones** [S27]:
  - EKS cluster subnets must be in at least two AZs, and the set of AZs is fixed when the cluster is created.
  - Nodes may sit in subnets that the cluster was not given.
  - An RDS DB subnet group must cover two AZs even for a Single-AZ instance.
- **Changing node groups.**
  - A managed node group's subnets cannot be changed in place: `subnet_ids`, `instance_types`, and `ami_type` force a new node group in Terraform [S28].
  - `terraform-aws-modules/eks` creates the new group before it deletes the old one.
  - EKS drains a deleted group's nodes, but may not honour PodDisruptionBudgets.
- **k3s** needs 2 cores and 2 GB for its server. Amazon Lightsail has no Kubernetes.

## 6. RDS for PostgreSQL

- **Versions.** RDS supports PostgreSQL 18, newest minor 18.6, with PostGIS 3.6.3 [S29].
- **PostGIS.** Creating the extension needs `rds_superuser`, which the master user has [S30].
- **Snapshots between accounts.** A snapshot encrypted with the default `aws/rds` key cannot be shared with another account. Sharing needs a customer managed key and two copies [S31].
- **Encryption by default.** The API and Terraform leave storage unencrypted unless asked [S32].
- **Moving a database between accounts.** AWS recommends `pg_dump -Fc` and `pg_restore` for a same-engine move. `pg_dumpall` does not work on RDS, so roles are created again in the target [S33].

## 7. Domains and moving between accounts

**Route 53 prices**, yearly, registration and renewal alike [S23]:

| Domain | Price |
|---|---|
| `.click` | $3 |
| `.link` | $5 |
| `.com` | $16 |
| `.net` | $17 |
| `.xyz` | $19 |

Route 53 does not sell `.kr`. Credits cannot pay for registration.

**Moving a domain to another AWS account**
- A Route 53 domain can be moved: the old account starts the move and the new one accepts within 3 days. A domain cannot move in its first 14 days [S34].
- The hosted zone does not move with it. It is created again in the new account, its records are copied, and the domain is pointed at the new name servers [S35].

**Keeping the domain in the old account instead**
- A record in a zone in one account can point at a load balancer in another, written with the `dualstack.` prefix [S36].
- A public ACM certificate cannot move between accounts. The new account requests its own, validated by a CNAME in whatever zone is authoritative [S37].
- Closing an account deletes most domains registered in it [S38].
- Registering a domain creates its hosted zone, and the registrant's email must be verified within 15 days or the domain is suspended [S38].

## 8. Facts behind the build

**Database connections**
- RDS for PostgreSQL 15 and later sets `rds.force_ssl` to 1, so clients must use TLS [S39].
- node-postgres (`pg-connection-string`) treats `sslmode=require` as `verify-full` and verifies against Node's CA list, which lacks the RDS CAs. `NODE_EXTRA_CA_CERTS` adds a bundle, and `sslcert` means a client certificate to it [S40][S41].
- Prisma's schema engine, used by `prisma migrate`, knows `disable`, `prefer`, and `require`, and falls back to `prefer` for other modes [S41].
- Prisma Migrate takes an advisory lock with a 10-second timeout. A migration that stops halfway leaves P3009 until it is resolved [S42].
- Since PostgreSQL 16, a non-superuser who creates a role gets only ADMIN OPTION on it, and `CREATE DATABASE … OWNER` needs the right to `SET ROLE` to the owner [S43].

**AWS defaults that the design overrides**
- An AWS Budgets cost budget includes credits by default, so its net cost stays near zero while credits pay [S44].
- `terraform-aws-modules/vpc` v6 does not give instances in public subnets a public IPv4 address unless asked (`map_public_ip_on_launch`) [S45].
- `terraform-aws-modules/eks` v21 makes the cluster endpoint private, turns on control-plane logs kept 90 days, and creates a KMS key, unless told otherwise [S46].

**Load balancer controller**
- Pod readiness gates hold a pod unready until the ALB finds it healthy, which stops a rollout from leaving no healthy target. The namespace must carry the label before its pods are created [S47].
- The controller finds ACM certificates from the Ingress hosts, so an Ingress needs no certificate ARN [S48].

**Kubernetes and GitHub**
- A Secret read as environment variables reaches a container only when it starts. Kustomize's `secretGenerator` names the Secret after a hash of its content, so a change rolls the pods [S49].
- GitHub re-runs a workflow run only within 30 days of the first run [S50].
- With a concurrency group, GitHub keeps one running and one pending run, and a newer pending run replaces the older one [S51].
- Express matches routes without regard to case unless `case sensitive routing` is on, while ALB path patterns are case-sensitive [S52].

## 9. Tools

| Tool | Licence and price | Install |
|---|---|---|
| kubectl | Apache-2.0, free [S53] | `brew install kubectl`; `winget install -e --id Kubernetes.kubectl` |
| kubectx and kubens | Apache-2.0, free [S54] | `brew install kubectx`; `winget install --id ahmetb.kubectx` and `ahmetb.kubens` |
| k9s | Apache-2.0, free [S55] | `brew install derailed/k9s/k9s`; `winget install k9s` |
| AWS CLI v2 | Apache-2.0, free | AWS's `.pkg` (macOS) or `.msi` (Windows) installer [S56] |
| Terraform | BSL 1.1; use for a team's own infrastructure is allowed [S57] | `brew install hashicorp/tap/terraform`; a zip from releases.hashicorp.com on Windows |
| Freelens | MIT, community-maintained; v1.10.3 on 2026-07-07; no account mentioned [S58] | `brew install --cask freelens`; `winget install Freelensapp.Freelens` |
| Lens Desktop | Personal is free for students and organisations under $10M; Plus and Pro cost $25–30 a month per user; a Lens ID is required [S59] | the vendor's installer |

- Lens Personal includes resource views, logs, metrics, and port forwarding. The automatic EKS integration is on paid plans; a local kubeconfig is on Personal [S59].
- OpenLens is no longer updated; Freelens is its maintained successor [S58].
- kubectl is supported within one minor version, older or newer, of the API server [S60].
- `aws login` (AWS CLI 2.32.0 or newer) signs in through the console in a browser and caches short-lived credentials, refreshed every 15 minutes, for up to the principal's session length [S61].

## Sources

**AWS accounts, Free Tier and billing**
- [S1] AWS Free Tier FAQs. https://aws.amazon.com/free/free-tier-faqs/
- [S2] AWS Billing User Guide, "Choosing a plan". https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans.html
- [S3] Amazon EC2 User Guide, "Track your Free Tier usage for Amazon EC2". https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-free-tier-usage.html
- [S4] AWS Billing User Guide, "Earning additional credits". https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans-activities.html
- [S5] AWS Promotional Credit Terms and Conditions. https://aws.amazon.com/awscredits/
- [S6] AWS Free Tier Terms (dated 2025-07-09). https://aws.amazon.com/free/terms/
- [S7] AWS Account Management, "AWS Regions for your projects" and "Sign up for AWS". https://docs.aws.amazon.com/accounts/latest/reference/project-regions.html and https://docs.aws.amazon.com/accounts/latest/reference/sign-up-for-aws.html
- [S8] AWS Account Management, "Activate advanced AWS features". https://docs.aws.amazon.com/accounts/latest/reference/activate-advanced-features.html
- [S9] Amazon EC2 FAQs, T4g free trial. https://aws.amazon.com/ec2/faqs/

**AWS prices**
- [S10] Amazon EKS pricing. https://aws.amazon.com/eks/pricing/
- [S11] Amazon VPC pricing, public IPv4. https://aws.amazon.com/vpc/pricing/
- [S12] Amazon ECR pricing. https://aws.amazon.com/ecr/pricing/
- [S21] Elastic Load Balancing, "Application Load Balancers". https://docs.aws.amazon.com/elasticloadbalancing/latest/application/application-load-balancers.html
- [S22] Amazon EC2 on-demand pricing, data transfer. https://aws.amazon.com/ec2/pricing/on-demand/
- [S23] Amazon Route 53 pricing and the domain price list. https://aws.amazon.com/route53/pricing/ and https://d32ze2gidvkk54.cloudfront.net/Amazon_Route_53_Domain_Registration_Pricing_20140731.pdf
- [S24] Amazon EKS User Guide, "AWS Fargate" and "Fargate Pod configuration". https://docs.aws.amazon.com/eks/latest/userguide/fargate.html and https://docs.aws.amazon.com/eks/latest/userguide/fargate-pod-configuration.html
- [S25] Amazon Aurora User Guide, "Scaling to zero ACUs with automatic pause and resume". https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2-auto-pause.html
- [S26] Amazon ECS pricing and AWS Fargate pricing. https://aws.amazon.com/ecs/pricing/ and https://aws.amazon.com/fargate/pricing/
- Seoul prices come from the AWS Price List API files for AmazonEKS, AmazonEC2, AmazonVPC, AWSELB, AmazonECR, AmazonRDS, AmazonECS, AmazonElastiCache and AWSDataTransfer: `https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/<service>/current/ap-northeast-2/index.json`
- [S13] `aws/amazon-vpc-cni-k8s`, `misc/eni-max-pods.txt`. https://github.com/aws/amazon-vpc-cni-k8s/blob/master/misc/eni-max-pods.txt

**GitHub**
- [S14] GitHub Docs, "Using secrets in GitHub Actions" and "Repository roles for an organization". https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions and https://docs.github.com/en/organizations/managing-user-access-to-your-organizations-repositories/managing-repository-roles/repository-roles-for-an-organization
- [S15] GitHub Docs, "Managing environments for deployment". https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-deployments/managing-environments-for-deployment
- [S16] GitHub Docs, "Configuring OpenID Connect in Amazon Web Services", and the repository's OIDC subject customization (`GET /repos/snuhcs-course/swpp-2026-project-team-09/actions/oidc/customization/sub`). https://docs.github.com/en/actions/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services

**Terraform and EKS**
- [S17] Terraform docs, S3 backend. https://developer.hashicorp.com/terraform/language/backend/s3
- [S18] Amazon EKS User Guide, "Grant IAM users access to Kubernetes with EKS access entries". https://docs.aws.amazon.com/eks/latest/userguide/access-entries.html
- [S19] Amazon EKS User Guide, "Understand the Kubernetes version lifecycle on EKS". https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- [S20] Amazon EKS User Guide, "Route TCP and UDP traffic with Network Load Balancers". https://docs.aws.amazon.com/eks/latest/userguide/network-load-balancing.html
- [S27] Amazon EKS User Guide, "View Amazon EKS networking requirements for VPC and subnets", and Amazon RDS User Guide, "Working with a DB instance in a VPC". https://docs.aws.amazon.com/eks/latest/userguide/network-reqs.html and https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_VPC.WorkingWithRDSInstanceinaVPC.html
- [S28] `hashicorp/terraform-provider-aws`, `internal/service/eks/node_group.go`, and the EKS `UpdateNodegroupConfig` API. https://github.com/hashicorp/terraform-provider-aws/blob/main/internal/service/eks/node_group.go and https://docs.aws.amazon.com/eks/latest/APIReference/API_UpdateNodegroupConfig.html

**RDS**
- [S29] RDS for PostgreSQL release notes, versions and extensions. https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-versions.html and https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-extensions.html
- [S30] Amazon RDS User Guide, "Managing spatial data with the PostGIS extension". https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.PostgreSQL.CommonDBATasks.PostGIS.html
- [S31] Amazon RDS User Guide, "Sharing encrypted snapshots". https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/share-encrypted-snapshot.html
- [S32] Amazon RDS API Reference, `CreateDBInstance`. https://docs.aws.amazon.com/AmazonRDS/latest/APIReference/API_CreateDBInstance.html
- [S33] Amazon RDS User Guide, "Importing data into PostgreSQL on Amazon RDS". https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Procedural.Importing.html

**Domains**
- [S34] Route 53 Developer Guide, "Transferring a domain to a different AWS account". https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/domain-transfer-between-aws-accounts.html
- [S35] Route 53 Developer Guide, "Migrating a hosted zone to a different AWS account". https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/hosted-zones-migrating.html
- [S36] Route 53 Developer Guide, "Routing traffic to an ELB load balancer". https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-to-elb-load-balancer.html
- [S37] AWS Certificate Manager User Guide, "DNS validation" and "Importing certificates". https://docs.aws.amazon.com/acm/latest/userguide/dns-validation.html and https://docs.aws.amazon.com/acm/latest/userguide/import-certificate.html
- [S38] Route 53 Developer Guide, "Registering a new domain". https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/domain-register.html

**Building it**
- [S39] Amazon RDS User Guide, "Using SSL with a PostgreSQL DB instance". https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.SSL.html
- [S40] `brianc/node-postgres`, `packages/pg-connection-string`. https://github.com/brianc/node-postgres/blob/master/packages/pg-connection-string/index.js
- [S41] Prisma docs, "Upgrade to Prisma ORM 7" (SSL) and "PostgreSQL". https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7 and https://www.prisma.io/docs/orm/overview/databases/postgresql
- [S42] Prisma docs, "Development and production" (advisory locking) and the error reference (P3009). https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production#advisory-locking and https://www.prisma.io/docs/orm/reference/error-reference#p3009
- [S43] PostgreSQL 18 documentation, `CREATE DATABASE` and `createrole_self_grant`. https://www.postgresql.org/docs/18/sql-createdatabase.html and https://www.postgresql.org/docs/18/runtime-config-client.html#GUC-CREATEROLE-SELF-GRANT
- [S44] AWS Budgets API Reference, `CostTypes`. https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_budgets_CostTypes.html
- [S45] `terraform-aws-modules/terraform-aws-vpc` v6.0.0, `variables.tf`. https://github.com/terraform-aws-modules/terraform-aws-vpc/blob/v6.0.0/variables.tf
- [S46] `terraform-aws-modules/terraform-aws-eks` v21.0.0, `variables.tf`. https://github.com/terraform-aws-modules/terraform-aws-eks/blob/v21.0.0/variables.tf
- [S47] AWS Load Balancer Controller, "Pod readiness gate". https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/deploy/pod_readiness_gate/
- [S48] AWS Load Balancer Controller, "Certificate discovery". https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/ingress/cert_discovery/
- [S49] Kubernetes docs, "Secrets", and Kustomize, `secretGenerator`. https://kubernetes.io/docs/concepts/configuration/secret/ and https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/secretgenerator/
- [S50] GitHub Docs, "Re-running workflows and jobs". https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-workflow-runs/re-running-workflows-and-jobs
- [S51] GitHub Docs, "Control the concurrency of workflows and jobs". https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/control-the-concurrency-of-workflows-and-jobs
- [S52] Express 5 API, application settings. https://expressjs.com/en/5x/api.html#app.settings.table

**Tools**
- [S53] `kubernetes/kubectl`. https://github.com/kubernetes/kubectl
- [S54] `ahmetb/kubectx`. https://github.com/ahmetb/kubectx
- [S55] `derailed/k9s`. https://github.com/derailed/k9s
- [S56] AWS CLI User Guide, "Installing or updating to the latest version of the AWS CLI", and its licence. https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html and https://raw.githubusercontent.com/aws/aws-cli/v2/LICENSE.txt
- [S57] `hashicorp/terraform`, `LICENSE`. https://raw.githubusercontent.com/hashicorp/terraform/main/LICENSE
- [S58] `freelensapp/freelens`, README and releases, and `MuhammedKalkan/OpenLens`. https://github.com/freelensapp/freelens and https://github.com/MuhammedKalkan/OpenLens
- [S59] Lens pricing and the licensing FAQ. https://lenshq.io/pricing and https://docs.lenshq.io/faq/subscription-and-licensing/
- [S60] Kubernetes, "Version Skew Policy". https://kubernetes.io/releases/version-skew-policy/
- [S61] AWS CLI User Guide, `aws login`. https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sign-in.html
