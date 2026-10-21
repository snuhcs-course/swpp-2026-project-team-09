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

## The database

Production's database is RDS for PostgreSQL 18 on a `db.t4g.micro` instance in zone `a`, with 20 GB of gp3 storage. It
has no public address, and its security group admits port 5432 only from the cluster's nodes, so only pods reach it.
RDS keeps automated backups for 7 days and can restore the database to any moment within them. `terraform destroy`
keeps a final snapshot, named `snunow-final-` and the instance's creation time in UTC.

Terraform generates the master user's password and keeps it in the state. The master user prepares each new database
once, with the database Job below. The servers then connect as their own roles, `main` and `match`, each of which owns
the database of the same name. The Release workflow assembles each server's `DATABASE_URL` in this form, with the
`database_endpoint` output as the host:

```text
postgresql://main:<password>@<database_endpoint>:5432/main?sslmode=verify-full
postgresql://match:<password>@<database_endpoint>:5432/match?sslmode=verify-full
```

RDS accepts only TLS connections. The main-server and match-server images carry RDS's CA bundle and point
`NODE_EXTRA_CA_CERTS` at it, so with `sslmode=verify-full` the servers verify the database's certificate and host name.
Prisma's migrations, which know no `verify-full`, fall back to `prefer` and still connect over TLS.

### Preparing a new database

`k8s/database-setup.yaml` is a Job that a team member runs once for each new database, after the apply that creates it
and before the first Release. As the master user, it creates the `main` and `match` roles with their passwords, a
database owned by each, and the PostGIS extension in `main`. The Release never applies it.

It reads the Secret `database-setup`, which is created by hand just before it and deleted after it:

| Key                 | Value                                            |
| ------------------- | ------------------------------------------------ |
| `PGHOST`            | `terraform output -raw database_endpoint`        |
| `PGUSER`            | `terraform output -raw database_master_username` |
| `PGPASSWORD`        | `terraform output -raw database_master_password` |
| `MAIN_DB_PASSWORD`  | The `main` role's new password                   |
| `MATCH_DB_PASSWORD` | The `match` role's new password                  |

The two new passwords also go into the repository secrets `PRODUCTION_MAIN_DB_PASSWORD` and
`PRODUCTION_MATCH_DB_PASSWORD`, from which the Release workflow assembles the servers' `DATABASE_URL`. GitHub never
shows a secret again, so generate and set them in the same shell that creates the Secret.

In `infra/production/terraform`, signed in to the account, with kubectl pointed at the cluster:

```bash
aws eks update-kubeconfig --name snunow --region ap-northeast-2 --alias snunow-production

MAIN_DB_PASSWORD=$(openssl rand -hex 32)
MATCH_DB_PASSWORD=$(openssl rand -hex 32)
gh secret set PRODUCTION_MAIN_DB_PASSWORD --body "$MAIN_DB_PASSWORD"
gh secret set PRODUCTION_MATCH_DB_PASSWORD --body "$MATCH_DB_PASSWORD"

kubectl --namespace snunow create secret generic database-setup \
  --from-literal=PGHOST="$(terraform output -raw database_endpoint)" \
  --from-literal=PGUSER="$(terraform output -raw database_master_username)" \
  --from-literal=PGPASSWORD="$(terraform output -raw database_master_password)" \
  --from-literal=MAIN_DB_PASSWORD="$MAIN_DB_PASSWORD" \
  --from-literal=MATCH_DB_PASSWORD="$MATCH_DB_PASSWORD"
kubectl apply -f ../k8s/database-setup.yaml
kubectl --namespace snunow wait --for=condition=complete job/database-setup --timeout=3m
kubectl --namespace snunow logs job/database-setup --all-containers
kubectl --namespace snunow delete job/database-setup secret/database-setup
```

The log shows `CREATE ROLE`, `GRANT ROLE`, `CREATE DATABASE`, and `REVOKE` for each role, then `CREATE EXTENSION`.
Deleting the Secret takes the master password out of the cluster.

The Job stops at its first error and is not retried, because its statements cannot run twice. If `wait` times out, the
log names the statement that failed. Drop what the Job created before it, with `DROP DATABASE` and then `DROP ROLE` in
psql as the master user (below). Then delete the Job alone, and apply it again.

### psql as the master user

In `infra/production/terraform`:

```bash
kubectl --namespace snunow run psql --rm -it --restart=Never --image=postgres:18 \
  --env=PGHOST="$(terraform output -raw database_endpoint)" \
  --env=PGUSER="$(terraform output -raw database_master_username)" \
  --env=PGPASSWORD="$(terraform output -raw database_master_password)" \
  --env=PGDATABASE=postgres --env=PGSSLMODE=require --command -- psql
```

`require` encrypts the connection without checking the certificate, since this pod has no CA bundle. `\connect main`
switches to a server's database, and `SET ROLE main;` makes what you create there belong to the server's role.

### A migration left halfway (P3009)

The main and match servers apply their pending migrations each time they start. A migration that stopped partway, for
example because its pod was killed, makes every later start fail with Prisma's error P3009, and the server's pods keep
restarting. A team member resolves it once by hand. The commands are for the main server; for the match server, write
`match-server` for `main-server`, and `match` for `main`.

1. Open a shell in a copy of one of the server's pods. The copy has the pod's image and `DATABASE_URL`, but runs the
   shell instead of the server, and no Service sends to it:

   ```bash
   kubectl --namespace snunow debug \
     "$(kubectl --namespace snunow get pod --selector app=main-server --output name | head -n 1)" \
     --copy-to=prisma --container=main-server -it -- bash
   ```

2. In that shell, `pnpm prisma migrate status` names the failed migration. Its SQL is in
   `prisma/migrations/<migration>/migration.sql`.
3. Compare that SQL with the database, in psql as the master user (above) after `\connect main` and `SET ROLE main;`.
   Then either:
   - undo what the migration changed, and run `pnpm prisma migrate resolve --rolled-back <migration>` in the shell, so
     that the server's next start applies the migration again; or
   - make the rest of its changes, and run `pnpm prisma migrate resolve --applied <migration>`.
4. Leave the shell, delete the copy, and restart the server:

   ```bash
   kubectl --namespace snunow delete pod prisma
   kubectl --namespace snunow rollout restart deployment/main-server
   ```

A migration that fails each time it runs needs a fix: mark it rolled back, and ship the fixed migration in a new
Release.
