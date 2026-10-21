# 03: The database and its setup Job, confirmed on a first apply in account A

Parent: [A01 spec](../spec.md)
Status: ready-for-agent
Blocked by: 02 (the cluster and the `snunow` namespace that the Job and the check pod run in)
Touches: `infra/production/terraform/` (the database), `infra/production/k8s/` outside the Kustomize base (the Job), the main-server and match-server Dockerfiles (the CA bundle), and the runbook's database section. Not the Kustomize base, which ticket 04 owns.

The code is agent work. The steps under "By hand" need a team member's AWS session in account A; an agent may drive the commands with that team member present. They come before ticket 05, because the Release workflow writes the `DATABASE_URL` form that this ticket confirms.

## What to build

The database, the Job that prepares it, and the TLS form the servers use with it (spec: "Database", and the database's security group under "Network"):

- **The instance.** RDS for PostgreSQL 18 at its newest minor version, on `db.t4g.micro`, Single-AZ in zone `a`, with 20 GB of gp3 storage, in a subnet group over ticket 01's two database subnets. Not publicly accessible. Automated backups kept 7 days, set explicitly, with point-in-time restore. Destroying it keeps a final snapshot. Terraform generates the master password and keeps it in the state.
- **Its security group** accepts port 5432 only from the nodes.
- **Outputs:** the database endpoint, and what the Job needs.
- **The Job**, kept apart from the Kustomize base, run once by hand as the master user. It creates the `main` and `match` roles and databases as `infra/postgres/init-databases.sh` does on laptops, grants each new role to the master user before its `CREATE DATABASE … OWNER`, and creates the PostGIS extension in `main`.
- **TLS.** The main-server and match-server images include the RDS global CA bundle and set `NODE_EXTRA_CA_CERTS` to it, so that neither the manifests nor the workflow handle the bundle. `DATABASE_URL` ends in `?sslmode=verify-full`.
- **The runbook's database section:** running the Job with the passwords that go into the `PRODUCTION_` repository secrets, and resolving a migration left halfway (P3009) with `prisma migrate resolve` from a one-off pod.

## By hand

1. **Before the first apply.**
   - Account A is on the Paid plan.
   - Its owner has created an IAM user for each team member: `AdministratorAccess`, a console password changed at first sign-in, and MFA required.
   - Account A's service quotas allow four `t4g.small` instances at once and an ALB.
   - `snunow.com` is registered in Route 53 in account A, so that ticket 06's apply finds its zone, and the registrant's email is verified within the 15 days.
2. **The first apply.** Run the runbook's bootstrap, fill account A's variables file, and apply tickets 01 to 03 from a laptop with a team member's own IAM user. Ticket 06's DNS variable, if ticket 06 is merged by then, stays off.
3. **The Job.** Run it from the runbook.
4. **The check pod.** Build the main-server image for `linux/arm64`, push it to the `main-server` repository, and start it in `snunow` with a throwaway Redis pod beside it, since its readiness also needs Redis, and with `DATABASE_URL` in the form above. Give it Production's real `INITIAL_ADMINISTRATOR_EMAILS`: the main server reads that setting only while no Administrator is registered, so a stand-in value would stay in the database after the first Release. Delete both pods afterwards.

## Acceptance criteria

- [ ] `terraform fmt -check` and `terraform validate` pass, locally and in the `terraform` CI job.
- [x] The instance, its backups, its final snapshot, and its security group are as above, and it is not publicly accessible.
- [x] The main-server and match-server images carry the CA bundle and set `NODE_EXTRA_CA_CERTS`; both projects' checks and the flow tests pass, and the laptop Compose stack starts as before.
- [ ] By hand: the four items before the first apply are done.
- [ ] By hand: the apply succeeded in account A, with the state and its lock file in the bucket.
- [ ] By hand: the Job created both roles and both databases, and PostGIS in `main`.
- [ ] By hand: the check pod migrated, loaded the seed, and answered ready on `/health/ready` against the real instance with `?sslmode=verify-full`. `## Comments` records the exact `DATABASE_URL` form for ticket 05, with the password left out.
- [ ] `## Comments` records how Terraform's AWS provider got the team member's credentials: from the `aws login` session directly, or through `aws configure export-credentials`. Ticket 07's guide states it.
- [x] The runbook's database section names the real Job, its inputs, and the P3009 commands.
- [x] Every new or changed source file (the `.tf` files, the Job, the two Dockerfiles) carries the `#` AI-generated box with a row for this change (`CLAUDE.md`).
- [ ] When done, the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section, and the time the steps by hand took is recorded beside it.

## Comments

- **The instance** (`infra/production/terraform/database.tf`): `aws_db_instance.database`, identifier `snunow`, PostgreSQL `18.6` on `db.t4g.micro`, 20 GB gp3 (encrypted), Single-AZ in `ap-northeast-2a`, in the VPC module's subnet group over the two database subnets, `publicly_accessible = false`, `backup_retention_period = 7`, and a final snapshot named `snunow-final-<creation time, UTC>` so that a second destroy in the same account does not collide. The master user is `postgres`, with a 32-character letters-and-digits password from `random_password`, kept in the state. `engine_version` is in `ignore_changes`, because RDS upgrades the minor version by itself and the plan would otherwise try to go back.
- **Its security group** `snunow-database` has one rule, TCP 5432 from the node security group, and no egress rule.
- **Outputs:** `database_endpoint` (the host name, without the port), `database_master_username`, and `database_master_password` (sensitive; `terraform output -raw` prints it).
- **Before the first apply**, `aws rds describe-orderable-db-instance-options --engine postgres --engine-version 18.6 --db-instance-class db.t4g.micro --region ap-northeast-2` must list the class: AWS's class table does not list `db.t4g.micro` for PostgreSQL 18. If it lists nothing, change the class or the version in `database.tf`.
- **The Job** is `infra/production/k8s/database-setup.yaml`: Job `database-setup` in `snunow`, outside the Kustomize base (`kubectl kustomize` with stand-in secrets renders the same 16 objects without it). An init container (`curlimages/curl:8.23.0`) fetches the RDS global bundle, and `postgres:18` runs psql with `sslmode=verify-full` against it. It reads the Secret `database-setup`: `PGHOST`, `PGUSER`, and `PGPASSWORD` from the three outputs, and `MAIN_DB_PASSWORD` and `MATCH_DB_PASSWORD`, which also go into the repository secrets `PRODUCTION_MAIN_DB_PASSWORD` and `PRODUCTION_MATCH_DB_PASSWORD`. The roles get no `CREATEDB`, which only `prisma migrate dev`'s shadow database needs. `backoffLimit: 0`, since its statements cannot run twice.
- **The Job, checked locally.** Its container's command and settings, read from the manifest, ran against a PostgreSQL 18 with PostGIS that accepts only TLS (as `rds.force_ssl` does) and a master user with `CREATEROLE` and `CREATEDB` but not superuser, verifying a local CA in place of the RDS bundle. Without the two `GRANT … TO CURRENT_USER` lines it fails with `must be able to SET ROLE "main"`; with them it creates both roles (not superuser, no `CREATEDB`), both databases owned by their roles, and PostGIS in `main`. On RDS, PostGIS needs the master user's `rds_superuser`, which the local check stands in for with PostGIS's trusted flag.
- **TLS.** The bundle sits at `/etc/ssl/certs/rds-global-bundle.pem` in both images (114 RDS CAs, read by Node through `tls.getCACertificates('extra')`), and `NODE_EXTRA_CA_CERTS` points at it. Both lines come after `pnpm install` and `pnpm build`: with `NODE_EXTRA_CA_CERTS` set, pnpm 12 trusts only that file and fails every registry download with `invalid peer certificate: UnknownIssuer`. Starting a command with pnpm at run time (`pnpm db:migrate`, `pnpm prisma …`) is unaffected.
- **The `DATABASE_URL` form, checked locally** (not yet against RDS): with `postgresql://main:<password>@database:5432/main?sslmode=verify-full` and the local CA mounted over the bundle, the main-server image migrated all 17 migrations, loaded the seed, and answered ready on `/health/ready`; the match-server image migrated and answered ready. With the image's own bundle, the main server's seed refused the local certificate (`unable to verify the first certificate`), so node-postgres does verify. A plain-TCP connection was refused. The check against the real instance stays with the check pod above.
- **P3009, checked locally.** With the last migration marked unfinished in `_prisma_migrations`, the main server exited with P3009; in a shell of the same image and settings, `pnpm prisma migrate status` named it and `pnpm prisma migrate resolve --applied <migration>` cleared it in 3 seconds, and the server started again. The runbook gets that shell with `kubectl debug <pod> --copy-to=prisma --container=main-server -- bash`, which keeps the pod's settings and drops its labels and probes.
- **Checks.** `terraform fmt -check`, `terraform init -backend=false -lockfile=readonly`, and `terraform validate` pass with Terraform 1.16.6 on macOS and in the `hashicorp/terraform:1.16.6` image on `linux/amd64`; the lock file adds `random` 3.9.1 for five platforms. The `terraform` CI job runs once the branch is pushed. `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, and `pnpm test` pass in `main-server` (1521 tests) and `match-server` (73 tests), and in `flow-tests` (11 tests, which build both images and run the Dev Server's stack too). The laptop Compose stack, started under a project name of its own with settings from the `.env.example` files, came up with every server answering 200 on `/health/ready`; there the bundle goes unused, since the laptop's `DATABASE_URL` has no `sslmode`.
- **Fixed before the first apply.** The final snapshot's name comes from `timestamp()` with `final_snapshot_identifier` in `ignore_changes`, not from `time_static`, so an instance replaced in the same state also gets a new name. The runbook's `kubectl debug` adds `--profile=baseline`, because kubectl's default profile adds `SYS_PTRACE`, which the namespace's Pod Security baseline level refuses.
