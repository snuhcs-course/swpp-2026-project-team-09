# production

Production's infrastructure and its runbook. Production runs on Amazon EKS in AWS's Seoul Region, `ap-northeast-2`, in
account A, a team member's AWS account on the Paid plan. Terraform builds its infrastructure, and each Release deploys
the app to it ([ADR 0006](../../docs/adr/0006-production-runs-on-eks-and-releases-are-pushed.md)).

## Terraform

`terraform/` is one root configuration that holds every AWS resource Production needs: the network, the cluster, the
database, the image registries, the Release workflow's role, the certificate and DNS records, and the budget. The team
members' IAM users stay out of it, so that no password or key lands in the state.

A team member applies it from a laptop, signed in to the account as their own IAM user. The state lives in the
account's state bucket, and the lock file that Terraform writes beside it stops two applies at once. The `terraform`
CI job runs `terraform fmt -check` and `terraform validate` on every push, without a backend or AWS credentials.

| In `terraform/`          | What it is                                                                         |
| ------------------------ | ---------------------------------------------------------------------------------- |
| `account-a.s3.tfbackend` | Account A's backend settings: its state bucket, `snunow-terraform-state-account-a` |
| `account.tfvars.example` | Every variable, with placeholders                                                  |
| `account-a.tfvars`       | Account A's variables file, which git ignores ([below](#the-variables-file))       |
| `.terraform.lock.hcl`    | The providers' versions and checksums, for macOS, Linux, and Windows               |

The commands below run in `infra/production/terraform`, signed in to account A.

### Creating the state bucket

Once per account, before its first `terraform init`:

```bash
aws s3api create-bucket --bucket snunow-terraform-state-account-a --region ap-northeast-2 \
  --create-bucket-configuration LocationConstraint=ap-northeast-2
aws s3api put-bucket-versioning --bucket snunow-terraform-state-account-a \
  --versioning-configuration Status=Enabled
```

A new bucket blocks public access and encrypts what it stores by default. Versioning keeps every earlier state, so that
a state broken by a failed apply can be restored.

### The variables file

It names people, the team members' IAM users and their addresses, so git ignores it and the state bucket keeps the
copy that every laptop starts from. The first time, copy the example and fill in every value:

```bash
cp account.tfvars.example account-a.tfvars
```

| Variable                | What it holds                                                                 |
| ----------------------- | ----------------------------------------------------------------------------- |
| `team_member_iam_users` | The IAM user names of the team members, each of which administers the cluster |
| `budget_alert_emails`   | The addresses that receive the budget's alerts, one per team member           |

After each change, put the copy in the state bucket:

```bash
aws s3 cp account-a.tfvars s3://snunow-terraform-state-account-a/account-a.tfvars
```

On another laptop, fetch it before planning:

```bash
aws s3 cp s3://snunow-terraform-state-account-a/account-a.tfvars account-a.tfvars
```

### Init, plan, and apply

```bash
terraform init -backend-config=account-a.s3.tfbackend
terraform plan -var-file=account-a.tfvars
terraform apply -var-file=account-a.tfvars
```

Run `init` again after pulling a change that adds a provider or a module. `apply` shows the plan once more and changes
nothing until you answer `yes`.

The first apply starts the budget's period, which runs to the end of 2026 without resetting each month; later applies
keep its start. The budget counts gross spend, so what credits pay counts too, and it emails every address at $50,
$100, $150, $200, $250, and $300 actually spent.

An address receives nothing until its owner verifies it. After the apply that adds an address, AWS Budgets sends it a
verification email; its owner opens the link within 12 hours while signed in to account A as their own IAM user. An
expired link is sent again with **Resend verification** on the budget's page in the Budgets console.
