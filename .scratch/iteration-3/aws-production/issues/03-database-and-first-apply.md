# 03: The database and its setup Job, confirmed on a first apply in account A

Parent: [spec](../spec.md)
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
- [ ] The instance, its backups, its final snapshot, and its security group are as above, and it is not publicly accessible.
- [ ] The main-server and match-server images carry the CA bundle and set `NODE_EXTRA_CA_CERTS`; both projects' checks and the flow tests pass, and the laptop Compose stack starts as before.
- [ ] By hand: the four items before the first apply are done.
- [ ] By hand: the apply succeeded in account A, with the state and its lock file in the bucket.
- [ ] By hand: the Job created both roles and both databases, and PostGIS in `main`.
- [ ] By hand: the check pod migrated, loaded the seed, and answered ready on `/health/ready` against the real instance with `?sslmode=verify-full`. `## Comments` records the exact `DATABASE_URL` form for ticket 05, with the password left out.
- [ ] `## Comments` records how Terraform's AWS provider got the team member's credentials: from the `aws login` session directly, or through `aws configure export-credentials`. Ticket 07's guide states it.
- [ ] The runbook's database section names the real Job, its inputs, and the P3009 commands.
- [ ] Every new or changed source file (the `.tf` files, the Job, the two Dockerfiles) carries the `#` AI-generated box with a row for this change (`CLAUDE.md`).
- [ ] When done, the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section, and the time the steps by hand took is recorded beside it.
