# production

Production's infrastructure and its runbook. Production runs on Amazon EKS in AWS's Seoul Region, `ap-northeast-2`, in
account A, a team member's AWS account on the Paid plan. Terraform builds its infrastructure, and each Release deploys
the app to it ([ADR 0006](../../docs/adr/0006-production-runs-on-eks-and-releases-are-pushed.md)).

Production answers at `https://api.snunow.com` for the app and at `https://admin.snunow.com` for the admin site. It
starts with only the seed data every system needs and never carries Demo Data. A team member new to it starts with
[the tool guide](#the-tool-guide) and [the rules for changing it](#changing-production).

## The tool guide

Every tool is free for the team. The AWS CLI, kubectl, kubectx and kubens, and k9s are open source; Terraform's licence
allows a team's use for its own infrastructure; and Freelens, the desktop app, is open source and needs no account.

The runbook's commands are written for bash or zsh. On Windows, run them in Git Bash, which comes with Git for Windows
and brings `openssl` with it.

### Installing the tools

The AWS CLI v2 comes from AWS's installer, and `aws login` needs 2.32 or newer. On macOS:

```bash
curl -o AWSCLIV2.pkg https://awscli.amazonaws.com/AWSCLIV2.pkg
sudo installer -pkg AWSCLIV2.pkg -target /
```

On Windows, in PowerShell:

```powershell
msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi
```

`aws --version` prints the version. Running the installer again updates it.

The rest come from Homebrew on macOS, where the `kubectx` formula brings `kubens` too:

```bash
brew install kubectl kubectx k9s hashicorp/tap/terraform
brew install --cask freelens
```

and from winget on Windows:

```powershell
winget install --id Git.Git
winget install --id Kubernetes.kubectl
winget install --id ahmetb.kubectx
winget install --id ahmetb.kubens
winget install --id Derailed.k9s
winget install --id Hashicorp.Terraform
winget install --id Freelensapp.Freelens
```

Open a new terminal afterwards, so that it finds the new commands.

### Signing in to AWS

Each team member has an IAM user of their own in the account ([Adding or removing a team
member](#adding-or-removing-a-team-member)). The first sign-in to the console changes its password and sets up MFA.
Then, on the laptop:

```bash
aws login
```

The first time, it asks for a Region: answer `ap-northeast-2`. A browser opens, where you sign in as your IAM user or
choose a console session that is already open. The CLI keeps short-lived credentials under `~/.aws/login/cache`
(`%USERPROFILE%\.aws\login\cache` on Windows) and refreshes them every 15 minutes. After at most 12 hours, run
`aws login` again. No access key is made, so none sits on the laptop. `aws sts get-caller-identity` shows who you are
signed in as, and `aws logout` ends the session.

Terraform reads that session directly: its AWS provider and its S3 backend take the credentials from the default
profile, so `terraform` runs in the same shell with nothing exported. kubectl, k9s, Freelens, and Lens get theirs the
same way, through the `aws eks get-token` command that the kubeconfig names.

### Connecting to the cluster

```bash
aws eks update-kubeconfig --name snunow --region ap-northeast-2 --alias snunow-production
kubectx snunow-production
kubens snunow
kubectl get pods
```

`update-kubeconfig` adds the cluster to `~/.kube/config` as the context `snunow-production`. kubectx switches to it,
and kubens makes `snunow`, where the app runs, its namespace, so that kubectl and k9s show the app without
`--namespace`. The runbook's commands name the namespace but not the context, so switch to `snunow-production` before
running them. `k9s` opens on the current context.

**Freelens** reads the same kubeconfig. Open it, find `snunow-production` among the clusters of its catalog, connect,
and choose `snunow` in the namespace filter.

**Lens Personal** is the alternative: free for students, but every team member needs a Lens ID to sign in. Install it
with `brew install --cask lens` or `winget install --id Mirantis.Lens`, sign in, and open `snunow-production` from the
kubeconfig in the same way. Its automatic EKS integration is on paid plans only, and the kubeconfig does without it.

### Looking into a problem

**Logs.** The commands below are for the main server; the other servers are `socket-server`, `worker-server`,
`match-server`, and `admin`.

```bash
kubectl --namespace snunow logs --selector app=main-server --prefix --tail=200
kubectl --namespace snunow logs --selector app=main-server --prefix --follow
kubectl --namespace snunow logs <pod> --previous
```

`--selector` reads every pod of the server, and `--prefix` names each line's pod. `--previous` shows the log of a
container before its last restart, for example the crash that restarted it. In Freelens, select a pod under
**Workloads** › **Pods** and open its logs.

**Restarting a Deployment.**

```bash
kubectl --namespace snunow rollout restart deployment/main-server
kubectl --namespace snunow rollout status deployment/main-server
```

In Freelens, a Deployment under **Workloads** › **Deployments** has **Restart** in its menu. A restart replaces the
pods with the same image and settings; a changed parameter reaches a server only with a Release. The main and socket
servers and the admin site start a new pod before stopping an old one. The worker and match servers use `Recreate`, so
each stops for the time its new pod takes to become ready.

**Forwarding a port.** This reaches a server from the laptop without the load balancer:

```bash
kubectl --namespace snunow port-forward service/main-server 3000:3000
curl http://localhost:3000/health/ready
```

The ports are the servers' own: 3000 to 3003 for the main, socket, worker, and match servers, 3100 for the admin site,
and 6379 for Redis. In Freelens, a Service's page has **Forward** beside each port.

### Logs last as long as their pod

Kubernetes keeps a container's log only while its pod exists, and nothing else in Production keeps them. A Release or a
restart replaces a server's pods, and their logs go with them; `--previous` shows only the last crash. So a tester's
report is looked into the same day, before the next Release, and the lines that matter are copied into the issue.

### kubectl's version

kubectl works with a cluster up to one minor version older or newer than itself. `kubectl version` prints both
versions: a laptop's 1.36 with the cluster's 1.37 is fine. When the cluster's `kubernetes_version` in
`terraform/cluster.tf` is raised, every laptop updates kubectl, with `brew upgrade kubectl` or
`winget upgrade --id Kubernetes.kubectl`. Terraform's version and the providers' versions are pinned in
`terraform/terraform.tf` and the committed lock file, and `terraform init` says when the laptop's Terraform is too old.

## Changing Production

- Looking and restarting, from Freelens, Lens, k9s, or kubectl, is fine.
- The manifests in `k8s/` change only through a pull request and a Release. A Release applies its target over what
  runs, so it overwrites a change made by hand in the cluster.
- The infrastructure in `terraform/` changes through a pull request, then `terraform apply` from a laptop.
- Secret values change with `aws ssm put-parameter --overwrite`, then an `all` Release rolls them to every server
  ([Rotating a secret](#rotating-a-secret)).
- Release tags go only on reviewed commits of the iteration branch.

### Adding or removing a team member

To add one:

1. The account's owner creates the IAM user in the IAM console, with `AdministratorAccess`, a console password that
   must be changed at the first sign-in, and MFA required.
2. A team member adds the user's name to `team_member_iam_users` and its owner's address to `budget_alert_emails` in
   the variables file, puts the copy in the state bucket, and applies ([The variables file](#the-variables-file)). The
   apply gives the user its access entry to the cluster.
3. The new member verifies the budget's email ([Init, plan, and apply](#init-plan-and-apply)) and follows
   [the tool guide](#the-tool-guide).

Removing one reverses those steps: take the user out of both variables, put the copy in the state bucket, and apply,
which removes the access entry and the address. Then the account's owner deletes the IAM user. If the member was an
Administrator, another Administrator removes them on the admin site's Administrators page.

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

The nodes keep the AMI release they were created with; setting `ami_release_version` in `cluster.tf` moves them to
another. A plan that shows `release_version` or `version` changing on the node group replaces both nodes one after the
other, which restarts every pod and empties Redis, so apply it at a quiet time.

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

Its pod carries the labels `app=database-setup` and `database-client=true`, which let it download RDS's CA bundle and
reach the database ([below](#network-policies)). It reads the Secret `database-setup`, which is created by hand just
before it and deleted after it:

| Key                 | Value                                            |
| ------------------- | ------------------------------------------------ |
| `PGHOST`            | `terraform output -raw database_endpoint`        |
| `PGUSER`            | `terraform output -raw database_master_username` |
| `PGPASSWORD`        | `terraform output -raw database_master_password` |
| `MAIN_DB_PASSWORD`  | The `main` role's new password                   |
| `MATCH_DB_PASSWORD` | The `match` role's new password                  |

The two new passwords also go into the account's Parameter Store, as the `SecureString` parameters
`/snunow/production/main-db-password` and `/snunow/production/match-db-password`, from which the Release workflow
assembles the servers' `DATABASE_URL`. Generate them in the same shell that creates the Secret, so that the Job and the
parameters get the same values. `--overwrite` also replaces a value the account already holds, for example one copied
from account A in a move, or one kept from an earlier database.

In `infra/production/terraform`, signed in to the account, with kubectl pointed at the cluster:

```bash
aws eks update-kubeconfig --name snunow --region ap-northeast-2 --alias snunow-production

MAIN_DB_PASSWORD=$(openssl rand -hex 32)
MATCH_DB_PASSWORD=$(openssl rand -hex 32)
aws ssm put-parameter --region ap-northeast-2 --name /snunow/production/main-db-password \
  --type SecureString --value "$MAIN_DB_PASSWORD" --overwrite
aws ssm put-parameter --region ap-northeast-2 --name /snunow/production/match-db-password \
  --type SecureString --value "$MATCH_DB_PASSWORD" --overwrite

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
kubectl --namespace snunow run psql --rm -it --restart=Never --image=postgres:18 --labels=database-client=true \
  --env=PGHOST="$(terraform output -raw database_endpoint)" \
  --env=PGUSER="$(terraform output -raw database_master_username)" \
  --env=PGPASSWORD="$(terraform output -raw database_master_password)" \
  --env=PGDATABASE=postgres --env=PGSSLMODE=require --command -- psql
```

The label `database-client=true` lets the pod reach the database ([below](#network-policies)). `require` encrypts the
connection without checking the certificate, since this pod has no CA bundle. `\connect main` switches to a server's
database, and `SET ROLE main;` makes what you create there belong to the server's role.

### A migration left halfway (P3009)

The main and match servers apply their pending migrations each time they start. A migration that stopped partway, for
example because its pod was killed, makes every later start fail with Prisma's error P3009, and the server's pods keep
restarting. A team member resolves it once by hand. The commands are for the main server; for the match server, write
`match-server` for `main-server`, and `match` for `main`.

1. Make a copy of one of the server's pods, and open a shell in it. The copy has the pod's image and `DATABASE_URL`,
   but sleeps instead of running the server. It has none of the pod's labels, so no Service sends to it, and the label
   `database-client=true` lets it reach the database ([below](#network-policies)). `--profile=baseline` keeps the copy
   within the namespace's Pod Security level, which refuses the capability that kubectl's default profile adds:

   ```bash
   kubectl --namespace snunow debug \
     "$(kubectl --namespace snunow get pod --selector app=main-server --output name | head -n 1)" \
     --copy-to=prisma --container=main-server --profile=baseline -- sleep infinity
   kubectl --namespace snunow label pod prisma database-client=true
   kubectl --namespace snunow wait --for=condition=Ready pod/prisma
   kubectl --namespace snunow exec -it prisma -- bash
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

## Network policies

Every pod in `snunow` starts with no traffic in or out, and NetworkPolicies allow what each needs. The VPC CNI enforces
them; its agent runs inside `aws-node`, so it adds no pod. They ship with every Release: `default-deny`, `dns`, `redis`,
`database-client`, and `database-setup` in the shared part, and one named after each server in its part. Their list of
allowed connections is `k8s/test/allowed-connections.txt`:

- every pod asks CoreDNS in `kube-system`, on port 53;
- the load balancer reaches `main-server`, `socket-server`, and `admin` on their ports;
- `main-server` reaches Redis, `match-server`, the database, and the internet on 443;
- `socket-server` reaches Redis;
- `worker-server` reaches `main-server` and the internet on 443;
- `match-server` reaches `main-server` and the database;
- `admin` reaches `main-server`.

Besides `main-server` and `match-server`, only pods labelled `database-client=true` reach the database. A pod started
by hand that needs it carries that label: psql and the copy above do, and so does the database Job, whose label
`app=database-setup` also lets it download RDS's CA bundle. A `kubectl exec` into a server's pod, such as a Collection
run by hand in the worker, has that server's allowances.

The load balancer's addresses are in the public subnets, where pods get theirs too, so the rule that admits it on the
three servers' ports admits any pod in another namespace there as well. Inside `snunow`, a pod reaches those ports only
when its own policy allows it. The kubelet's probes need no rule, since the VPC CNI always lets a pod and its own node
reach each other. A new pod is open for the seconds until the VPC CNI has applied its policies.

A refused connection times out rather than failing at once. A new connection that a change needs is added to the
policies and to `allowed-connections.txt` in the same pull request, and `k8s/test/targets.sh` checks the two agree.
A server's Release applies only the shared policies and its own, so the connection opens once an `all` Release, or a
Release of each end's server, has applied both ends' policies. A Release of an earlier commit brings back that
commit's shared policies.
`k8s/test/cluster.sh` runs the policies in a throwaway k3s cluster in Docker and tries every connection.

## First setup

Once, in this order. A move to another account has its own steps ([Moving to account B](#moving-to-account-b)).

1. **By hand, before Terraform.** The account is on the Paid plan, and each team member has an IAM user
   ([Adding or removing a team member](#adding-or-removing-a-team-member)). `snunow.com` is registered in Route 53 in
   account A, whose registrant email is verified within 15 days. The account's service quotas allow four `t4g.small`
   instances at once, for a node group replacement, and an ALB.
2. **The first apply.** [Create the state bucket](#creating-the-state-bucket), write
   [the variables file](#the-variables-file) with `enable_dns_records = false`, and [apply](#init-plan-and-apply). In
   the account that holds the zone, the apply waits until the certificate is issued.
3. **The database.** [Prepare it](#preparing-a-new-database), which also puts its two passwords in Parameter Store.
4. **The repository variables.** In the repository's **Settings** › **Secrets and variables** › **Actions** ›
   **Variables**, set the Release workflow's variables from `terraform output -raw <output>`, and the admin site's two
   public build arguments:

   | Repository variable                | Value                                                         |
   | ---------------------------------- | ------------------------------------------------------------- |
   | `PRODUCTION_REGION`                | `terraform output -raw region`, `ap-northeast-2`              |
   | `PRODUCTION_DEPLOY_ROLE_ARN`       | `terraform output -raw deploy_role_arn`, the role it assumes  |
   | `PRODUCTION_CLUSTER_NAME`          | `terraform output -raw cluster_name`, `snunow`                |
   | `PRODUCTION_ECR_REGISTRY`          | `terraform output -raw ecr_registry`, the registry host       |
   | `PRODUCTION_DATABASE_ENDPOINT`     | `terraform output -raw database_endpoint`, for `DATABASE_URL` |
   | `NEXT_PUBLIC_GOOGLE_CLIENT_ID`     | The admin Google client's ID, as `GOOGLE_ADMIN_CLIENT_ID`     |
   | `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY` | The Kakao app's JavaScript key, for the admin site's maps     |

   With the GitHub CLI, from this folder:

   ```bash
   for output in region deploy_role_arn cluster_name ecr_registry database_endpoint; do
     name=$(echo "$output" | tr '[:lower:]' '[:upper:]')
     gh variable set "PRODUCTION_${name}" --body "$(terraform output -raw "$output")"
   done
   ```

5. **The other parameters.** Put the seven parameters under `/snunow/production/` that the database's steps did not,
   with Production's own values, never the Dev Server's. The key pair is stored as PEM with real line breaks. A PEM
   starts with `-`, so it goes in as `--value=...`, which the CLI cannot take for an option. `read -rs` takes a value
   typed or pasted without showing it, and keeps it out of the shell's history:

   ```bash
   PRIVATE_KEY=$(openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-256 -pkeyopt ec_param_enc:named_curve)
   PUBLIC_KEY=$(printf '%s\n' "$PRIVATE_KEY" | openssl pkey -pubout)
   aws ssm put-parameter --region ap-northeast-2 --name /snunow/production/access-token-private-key \
     --type SecureString --value="$PRIVATE_KEY" --overwrite
   aws ssm put-parameter --region ap-northeast-2 --name /snunow/production/access-token-public-key \
     --type SecureString --value="$PUBLIC_KEY" --overwrite

   aws ssm put-parameter --region ap-northeast-2 --name /snunow/production/worker-token \
     --type SecureString --value "$(openssl rand -hex 32)" --overwrite
   aws ssm put-parameter --region ap-northeast-2 --name /snunow/production/match-server-token \
     --type SecureString --value "$(openssl rand -hex 32)" --overwrite

   read -rs KAKAO_REST_API_KEY
   aws ssm put-parameter --region ap-northeast-2 --name /snunow/production/kakao-rest-api-key \
     --type SecureString --value "$KAKAO_REST_API_KEY" --overwrite
   read -rs OPENROUTER_API_KEY
   aws ssm put-parameter --region ap-northeast-2 --name /snunow/production/openrouter-api-key \
     --type SecureString --value "$OPENROUTER_API_KEY" --overwrite
   read -rs INITIAL_ADMINISTRATOR_EMAILS
   aws ssm put-parameter --region ap-northeast-2 --name /snunow/production/initial-administrator-emails \
     --type String --value "$INITIAL_ADMINISTRATOR_EMAILS" --overwrite

   aws ssm get-parameters-by-path --region ap-northeast-2 --path /snunow/production --query 'Parameters[].Name'
   ```

   The Kakao key is the REST API key of the team's Kakao app, and the OpenRouter key is the Assistant's
   (`main-server/.env.example` says how to make one). The administrators' addresses are those the team members sign in
   to the admin site with, separated by commas. The last command lists the nine parameters.

6. **The consoles, by hand.**
   - In the Google Cloud project, add `https://admin.snunow.com` to the admin Google client's authorized JavaScript
     origins, and publish the OAuth consent screen, so that accounts outside the team can sign in.
   - In the Kakao app, add `https://admin.snunow.com` to the JavaScript key's site domains. Leave the REST API key
     without an allowed-IP list, because the nodes' addresses change whenever a node is replaced.
7. **The first Release**, an `all` Release ([Releases](#releases)). The load balancer controller creates the ALB from
   its Ingresses.
8. **The records.** Set `enable_dns_records = true` in the variables file, put the copy in the state bucket, and apply.
   `api` and `admin` then point at the ALB, and `https://api.snunow.com/health/ready` answers within minutes. The
   variable stays on, so that every later apply keeps the records, and points them at a new ALB when an Ingress is
   made again.
9. **The Collections.** The worker collects nothing when it starts, so run each Source's collection once by hand in
   the worker pod:

   ```bash
   kubectl --namespace snunow exec deployment/worker-server -- node dist/collect \
     coop_menus dormitory_menus veterinary_menus snu_events shuttle_stops shuttle_vehicles
   ```

   It logs for each Source whether its Collection succeeded, and exits with status 1 when one failed.

10. **The Production APK** ([The Production APK](#the-production-apk)).

## Releases

### Naming and pushing a Release

A Release is a tag named `snunow/<target>/YY.MM.DD-N` on a reviewed commit of the iteration branch. Pushing it starts
the Release workflow, which deploys the target at that commit.

| Target          | What it deploys                |
| --------------- | ------------------------------ |
| `main-server`   | The main server                |
| `socket-server` | The socket server              |
| `worker-server` | The worker server              |
| `match-server`  | The match server               |
| `admin`         | The admin site                 |
| `all`           | All five, at the tagged commit |

`all` is for the first deploy, for a change that spans servers, and for rolling a changed setting or secret value to
every server. `YY.MM.DD` is the day in Korea, and `N` is the target's order that day, from 1, so
`snunow/main-server/26.11.13-1` and `snunow/all/26.11.13-1` can share a day. A name that does not match, such as
`snunow/web/26.11.13-1` or `snunow/main-server/26.11.13`, fails the run at its first step.

```bash
git fetch origin
git ls-remote --tags origin 'refs/tags/snunow/main-server/26.11.13-*'
git tag snunow/main-server/26.11.13-1 <commit>
git push origin snunow/main-server/26.11.13-1
```

The second line lists the day's earlier Releases of the target, from which N follows. `<commit>` is a reviewed commit
of the iteration branch, usually its newest, such as `origin/2.0/Main`.

Every Release also applies the shared part at its commit: the settings, the Secret, the Ingresses, and Redis. A server
takes up a changed setting or secret value when it is next deployed.

### Across servers

The servers are separate services, so different servers may run different commits. A change that spans servers is
released in an order that keeps the old and new versions working together, for example the main server's new route
before the match server that calls it. Or it goes out as one `all` Release.

### Following a Release

The run appears in the repository's **Actions** tab under the Release workflow, named after the tag:

1. It checks the tag's name.
2. It waits for CI's results on the tagged commit. Every CI job must have passed; CI runs on the tag's push too, so a
   tagged commit always gets results. While a job is queued or running, the Release waits. A failed job fails the
   Release before any AWS step: fix the commit through a pull request and release the new one.
3. It builds the target's arm64 images and pushes them to ECR, tagged with the commit and with the tag's name with `/`
   as `-`, for example `main-server-26.11.13-1`. An image already built for the commit is tagged, not built again.
4. A job for each server it deploys applies the server's target and waits until its Deployment has rolled out. A
   Deployment that does not become ready fails the run. The main and socket servers and the admin site keep their old
   pods serving then; the worker and match servers, which use `Recreate`, stay down until a working Release.

A newer Release of a server cancels that server's running one, and Releases of different servers deploy at once. In
the cluster, `kubectl --namespace snunow rollout status deployment/<server>` follows a rollout, and
`kubectl --namespace snunow get pods` shows the pods.

### Fixing a bad Release, and deploying an earlier one again

A bad Release is fixed with a new Release of a fixed commit.

In an emergency, an earlier Release is deployed again from the **Actions** tab: open the Release workflow, choose
**Run workflow**, pick the earlier Release's tag under **Use workflow from**, and run it. It deploys that tag's target
at the tag's commit, and puts back that commit's shared part, so its Ingresses and Redis come back too.

Never deploy again across a migration. Migrations only move forward, so a server older than the database's schema may
fail. To see whether Releases since the earlier one brought a migration:

```bash
git diff --stat <earlier tag> <current tag> -- main-server/prisma/migrations match-server/prisma/migrations
```

If any did, fix with a new Release instead.

### Rotating a secret

Put the new value over the old one, then push an `all` Release of the newest reviewed commit, which writes a new
Secret and rolls every server onto it:

```bash
aws ssm put-parameter --region ap-northeast-2 --name /snunow/production/worker-token \
  --type SecureString --value "$(openssl rand -hex 32)" --overwrite
```

Until the last server has rolled out, two servers that share a token may disagree for a minute, so rotate at a quiet
time.

- **A database password** is also the role's password in the database. Run `ALTER ROLE main PASSWORD '<new>';`
  ([psql as the master user](#psql-as-the-master-user)) just before the `all` Release, with the same value as the
  parameter.
- **`initial-administrator-emails`** is read only while the database holds no Administrator. Afterwards Administrators
  register each other on the admin site.

## Capacity

```bash
kubectl top nodes
kubectl --namespace snunow top pods
```

The cluster's `metrics-server` add-on serves these, and Freelens shows the same numbers. Each container sets a memory
request and limit in its part, `k8s/parts/<server>/<server>.yaml`, and Redis in `k8s/parts/shared/redis.yaml`. A pod
is placed only on a node with room for its request, and a container that goes over its limit is killed and restarted:
`kubectl --namespace snunow describe pod <pod>` shows `OOMKilled` as the last state then.

- **A container's memory** is raised in its part through a pull request, then a Release of that server.
- **The node size** is `node_instance_type` in `terraform/variables.tf`, `t4g.small` (2 GiB) by default, for example
  `t4g.medium` (4 GiB). Change it through a pull request, then apply at a quiet time. EKS cannot change a node group's
  instance type in place, so the apply creates a new node group before it deletes the old one: every pod restarts and
  Redis empties.

## The Production APK

Built by hand as the [dev APK](../deploy/README.md#adding-an-apk) is, signed with the shared debug key, with both
server addresses in `mobile/.env` set to Production's:

```text
EXPO_PUBLIC_MAIN_SERVER_URL=https://api.snunow.com
EXPO_PUBLIC_SOCKET_SERVER_URL=https://api.snunow.com
```

Leave `INVITE_LINK_HOST` empty, as for the dev APK. Then tag the commit it was built from as
`snunow/app/YY.MM.DD-N`, where N is the app's order that day, and attach the APK, named after the tag with `/` as `-`,
to a GitHub release page for that tag:

```bash
git tag snunow/app/26.11.13-1 <commit>
git push origin snunow/app/26.11.13-1
cp mobile/android/app/build/outputs/apk/release/app-release.apk snunow-app-26.11.13-1.apk
gh release create snunow/app/26.11.13-1 snunow-app-26.11.13-1.apk --verify-tag \
  --title snunow/app/26.11.13-1 --notes 'The app for Production, at https://api.snunow.com.'
```

An app tag deploys nothing: the Release workflow does not run for it, and it is not a Release. Testers open the release
page in a phone's browser and install the APK from it.

## Moving to account B

Only if the money runs short, and at a quiet time, not during user testing or the beta. Account B's names are A's with
`account-b` for `account-a`.

Sign in to B under a profile of its own, and keep the default profile on A. From here the shell runs with B's
profile. Commands for A name `--profile default`, or, for Terraform and kubectl, run after `unset AWS_PROFILE`. The
context `snunow-production-b` keeps B's profile by itself. The commands run in `infra/production/terraform`:

```bash
aws login --profile account-b
export AWS_PROFILE=account-b
aws eks update-kubeconfig --name snunow --region ap-northeast-2 --alias snunow-production-b --profile account-b
```

1. **B's account and files.** B's owner switches B to the Paid plan and creates the team members' IAM users in B. In
   B, create the state bucket `snunow-terraform-state-account-b` ([Creating the state
   bucket](#creating-the-state-bucket)). Add `terraform/account-b.s3.tfbackend`, A's file with B's bucket, through a
   pull request. Write `account-b.tfvars` from the example, with B's IAM users, `holds_zone = false`, and
   `enable_dns_records = false`, and put its copy in B's bucket.
2. **B's apply.** `-reconfigure` points the folder at B's state without copying A's into it; never answer `yes` to a
   question about copying state.

   ```bash
   terraform init -reconfigure -backend-config=account-b.s3.tfbackend
   terraform apply -var-file=account-b.tfvars
   terraform output certificate_validation_records
   ```

   B's apply requests the certificate without waiting for it, creates B's budget, whose addresses verify their emails
   as in A, and outputs a validation record for each of `api.snunow.com` and `admin.snunow.com`. Add both to A's zone,
   with each record's `name` and `value` from the output, and wait until B's certificate is issued:

   ```bash
   ZONE_ID=$(aws route53 list-hosted-zones-by-name --profile default --dns-name snunow.com \
     --query 'HostedZones[0].Id' --output text)
   aws route53 change-resource-record-sets --profile default --hosted-zone-id "$ZONE_ID" --change-batch '{"Changes": [{
     "Action": "UPSERT", "ResourceRecordSet": {"Name": "<name>", "Type": "CNAME", "TTL": 300,
     "ResourceRecords": [{"Value": "<value>"}]}}]}'

   CERTIFICATE_ARN=$(aws acm list-certificates --region ap-northeast-2 \
     --query "CertificateSummaryList[?DomainName=='api.snunow.com'].CertificateArn" --output text)
   aws acm wait certificate-validated --region ap-northeast-2 --certificate-arn "$CERTIFICATE_ARN"
   ```

   The two validation records stay in A's zone after the move: ACM renews B's certificate through them.

3. **The records' TTL.** Nothing to change. `api` and `admin` are alias records to the ALB, and an alias record to an
   AWS resource has no TTL of its own: Route 53 answers with the resource's, and a load balancer's DNS entry has a TTL
   of 60 seconds (AWS's [Route 53][alias-ttl] and [Elastic Load Balancing][elb-ttl] guides). So resolvers already
   forget the old address within a minute of step 7.
4. **The parameters.** Copy every parameter under `/snunow/production/` from A to B:

   ```bash
   for name in $(aws ssm get-parameters-by-path --profile default --region ap-northeast-2 \
       --path /snunow/production --query 'Parameters[].Name' --output text); do
     type=$(aws ssm get-parameter --profile default --region ap-northeast-2 --name "$name" \
       --query Parameter.Type --output text)
     value=$(aws ssm get-parameter --profile default --region ap-northeast-2 --name "$name" \
       --with-decryption --query Parameter.Value --output text)
     aws ssm put-parameter --region ap-northeast-2 --name "$name" --type "$type" --value="$value" --overwrite
   done
   aws ssm get-parameters-by-path --region ap-northeast-2 --path /snunow/production --query 'Parameters[].Name'
   ```

   The last command lists the nine parameters in B. A's stay as they are.

5. **B's first Release.** With `kubectx snunow-production-b`, [prepare B's database](#preparing-a-new-database),
   leaving out its first command, which would point `snunow-production` at B. Its `--overwrite` puts B's new database
   passwords over the copied ones. Set the repository variables to B's outputs
   ([First setup](#first-setup), step 4). From then on every Release deploys to B. Push an `all` Release, which
   deploys all five servers to B at one commit and makes B's ALB. Once it has rolled out, stop B's servers:

   ```bash
   kubectl --context snunow-production-b --namespace snunow scale deployment \
     main-server socket-server worker-server match-server admin --replicas=0
   ```

6. **The data.** The app is down for 10 to 30 minutes from here, and no write is lost. Stop A's servers, and dump A's
   two databases from a `postgres:18` pod in A's cluster:

   ```bash
   unset AWS_PROFILE
   terraform init -reconfigure -backend-config=account-a.s3.tfbackend
   kubectl --context snunow-production --namespace snunow scale deployment \
     main-server socket-server worker-server match-server admin --replicas=0
   kubectl --context snunow-production --namespace snunow run dump --restart=Never --image=postgres:18 \
     --labels=database-client=true \
     --env=PGHOST="$(terraform output -raw database_endpoint)" \
     --env=PGUSER="$(terraform output -raw database_master_username)" \
     --env=PGPASSWORD="$(terraform output -raw database_master_password)" \
     --env=PGSSLMODE=require --command -- sleep infinity
   kubectl --context snunow-production --namespace snunow wait --for=condition=Ready pod/dump
   kubectl --context snunow-production --namespace snunow exec dump -- pg_dump -Fc --dbname=main --file=/tmp/main.dump
   kubectl --context snunow-production --namespace snunow exec dump -- pg_dump -Fc --dbname=match --file=/tmp/match.dump
   kubectl --context snunow-production --namespace snunow cp dump:/tmp/main.dump main.dump
   kubectl --context snunow-production --namespace snunow cp dump:/tmp/match.dump match.dump
   kubectl --context snunow-production --namespace snunow delete pod dump
   ```

   Copy the dumps into a pod in B's cluster. There, drop the two databases that B's first Release migrated and seeded,
   and restore A's in their place. `--create` makes each database again with its owner and settings from the dump:

   ```bash
   export AWS_PROFILE=account-b
   terraform init -reconfigure -backend-config=account-b.s3.tfbackend
   kubectl --context snunow-production-b --namespace snunow run restore --restart=Never --image=postgres:18 \
     --labels=database-client=true \
     --env=PGHOST="$(terraform output -raw database_endpoint)" \
     --env=PGUSER="$(terraform output -raw database_master_username)" \
     --env=PGPASSWORD="$(terraform output -raw database_master_password)" \
     --env=PGSSLMODE=require --command -- sleep infinity
   kubectl --context snunow-production-b --namespace snunow wait --for=condition=Ready pod/restore
   kubectl --context snunow-production-b --namespace snunow cp main.dump restore:/tmp/main.dump
   kubectl --context snunow-production-b --namespace snunow cp match.dump restore:/tmp/match.dump
   kubectl --context snunow-production-b --namespace snunow exec restore -- \
     psql --dbname=postgres --command='DROP DATABASE main' --command='DROP DATABASE match'
   kubectl --context snunow-production-b --namespace snunow exec restore -- \
     pg_restore --create --exit-on-error --dbname=postgres /tmp/main.dump
   kubectl --context snunow-production-b --namespace snunow exec restore -- \
     pg_restore --create --exit-on-error --dbname=postgres /tmp/match.dump
   kubectl --context snunow-production-b --namespace snunow delete pod restore
   rm main.dump match.dump
   ```

   A restore that stops at an error leaves A's data untouched: drop that database again and repeat its restore. Then
   start B's servers:

   ```bash
   kubectl --context snunow-production-b --namespace snunow scale deployment main-server socket-server --replicas=2
   kubectl --context snunow-production-b --namespace snunow scale deployment \
     worker-server match-server admin --replicas=1
   ```

7. **The records.** In A's zone, point `api` and `admin` at B's ALB. With the two validation records, the move edits
   four records by hand. For an ALB in another account, Route 53 needs its DNS name with `dualstack.` in front:

   ```bash
   ZONE_ID=$(aws route53 list-hosted-zones-by-name --profile default --dns-name snunow.com \
     --query 'HostedZones[0].Id' --output text)
   LB_HOST=$(kubectl --context snunow-production-b --namespace snunow get ingress api \
     --output jsonpath='{.status.loadBalancer.ingress[0].hostname}')
   LB_ZONE_ID=$(aws elbv2 describe-load-balancers --region ap-northeast-2 \
     --query "LoadBalancers[?DNSName=='$LB_HOST'].CanonicalHostedZoneId" --output text)
   for host in api admin; do
     aws route53 change-resource-record-sets --profile default --hosted-zone-id "$ZONE_ID" --change-batch "{
       \"Changes\": [{\"Action\": \"UPSERT\", \"ResourceRecordSet\": {\"Name\": \"$host.snunow.com\", \"Type\": \"A\",
       \"AliasTarget\": {\"HostedZoneId\": \"$LB_ZONE_ID\", \"DNSName\": \"dualstack.$LB_HOST\",
       \"EvaluateTargetHealth\": true}}}]}"
   done
   ```

   Within a minute, `https://api.snunow.com/health/ready` answers from B.

8. **A's teardown.** Take the two records out of A's state, so that the destroy leaves them, delete A's Ingresses, and
   destroy. `enable_dns_records=false` stops the records' lookup, which finds no ALB once the Ingresses are gone:

   ```bash
   unset AWS_PROFILE
   terraform init -reconfigure -backend-config=account-a.s3.tfbackend
   terraform state rm 'aws_route53_record.ingress["api"]' 'aws_route53_record.ingress["admin"]'
   kubectl --context snunow-production --namespace snunow delete ingress api admin
   terraform destroy -var-file=account-a.tfvars -var enable_dns_records=false
   ```

   The hosted zone, the domain, and A's parameters stay. Account A stays open, because closing it deletes the domain,
   and its owner edits the zone from then on.

Sessions live in the database, and the access-token keys stay the same because the parameters are copied, so Users
stay signed in. Redis starts empty, as after any restart.

Afterwards each team member signs the default profile in to B, answering `y` when `aws login` asks to switch it, and
points `snunow-production` at B's cluster:

```bash
unset AWS_PROFILE
aws login
aws eks update-kubeconfig --name snunow --region ap-northeast-2 --alias snunow-production
terraform init -reconfigure -backend-config=account-b.s3.tfbackend
```

From then on, the runbook's `account-a` names read `account-b`.

[alias-ttl]: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-choosing-alias-non-alias.html
[elb-ttl]: https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/how-elastic-load-balancing-works.html#request-routing

## Tearing down

Delete the Ingresses before `terraform destroy`. The load balancer controller deletes the ALB only while it runs, and
the destroy removes the controller, so an ALB left behind keeps billing. `kubectl delete` returns once the controller
has deleted the ALB. `enable_dns_records=false` stops the records' lookup, which finds no ALB by then; the destroy
deletes the records either way.

In `infra/production/terraform`, with kubectl on `snunow-production`:

```bash
kubectl --namespace snunow delete ingress api admin
terraform destroy -var-file=account-a.tfvars -var enable_dns_records=false
```

The database's final snapshot, the parameters, the state bucket, the hosted zone, the domain, and the IAM users stay.

## What CI does not cover

CI checks Terraform's format and validity (the `terraform` job), renders all six Kustomize targets (the `manifests`
job), runs the admin site's tests, its health routes among them, and runs the servers' and the flows' tests. What
reaches AWS is checked by hand instead, in
[ticket 08 of A01](../../.scratch/iteration-2/A01-aws-production/issues/08-first-setup-and-checks-by-hand.md):

- The first setup, and the first Release's OIDC token against the deploy role's trust.
- `api.snunow.com` and `admin.snunow.com` resolving to the ALB with a valid certificate.
- From a phone off the campus network: `/health/ready`, sign-in, a walking route, an Assistant answer, and a WebSocket
  open for more than three minutes.
- From a laptop outside AWS: `/admin/administrators` and `/ADMIN/administrators` answering 404 on `api.snunow.com`,
  and the admin site signing an Administrator in and publishing a Global Event.
- Every Source's Collection from AWS's addresses.
- Each team member's access, with kubectl and with Freelens or Lens.
- The NetworkPolicies: every server, Redis, and the database Job working under them, and a pod without the
  `database-client` label failing to reach the database.
- Releases: one server's Release without a failed request and without touching the others, a commit whose CI fails
  not deploying, a malformed name failing at the name check, and an app tag starting no Release.
- Memory after the first week, from `kubectl top`.
- The budget's first alert reaching the team.
