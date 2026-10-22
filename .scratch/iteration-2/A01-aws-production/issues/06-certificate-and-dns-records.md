# 06: The certificate and the DNS records

Parent: [A01 spec](../spec.md)
Status: resolved
Blocked by: 01 (the root configuration)
Touches: `infra/production/terraform/` only, in files of its own beside the variables and outputs it adds.

## What to build

Terraform gives Production its HTTPS names (spec: "Entry: load balancer, domain, and certificate", and steps 2 and 7 of "Moving to account B"):

- **The zone** of `snunow.com` is read, never created or destroyed. Registering the domain created it in account A.
- **The certificate.** One ACM certificate for `api.snunow.com` and `admin.snunow.com`, validated by DNS. A variable says whether this account holds the zone. In account A, Terraform writes the validation records into the zone and waits until the certificate is issued. In account B, it requests the certificate without waiting and outputs the validation record to add to A's zone by hand.
- **The records.** A variable, off on the first apply, turns on the lookup of the ALB that the load balancer controller made for the IngressGroup `snunow`, found by its tag, and the alias records `api` and `admin` to it. An Ingress deleted and created again gives a new ALB, and the next apply points the records at it.

The controller finds the certificate from the Ingress hosts, so the manifests carry no certificate ARN.

## Acceptance criteria

- [x] `terraform fmt -check` and `terraform validate` pass, locally and in the `terraform` CI job.
- [x] With the records variable off, the configuration looks up no load balancer, so an apply works before any Ingress exists.
- [x] In the account that holds the zone, the apply validates the certificate in the zone and waits for it; in the other account, it does not wait and outputs the validation record.
- [x] The ALB is found by the IngressGroup's tag, never by a name or ARN written into the configuration.
- [x] The hosted zone is only read.
- [x] Every new or changed `.tf` file carries the `#` AI-generated box with a row for this change (`CLAUDE.md`).
- [x] When done, the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.

## Comments

- The variables are `holds_zone` (default true; account B sets false) and `enable_dns_records` (default false). The second is refused while the first is false, because the records go in the zone. The output `certificate_validation_records` gives each domain's validation record.
- The certificate has two validation CNAMEs, one for `api` and one for `admin`, because ACM's record differs per domain name and per account. So the move to account B adds two validation records to A's zone by hand, besides the two alias records.
- `terraform fmt -check`, `terraform init -backend=false -input=false -lockfile=readonly`, and `terraform validate`, the `terraform` CI job's three steps, pass locally on Terraform 1.16.6. The job passes on GitHub too. No provider was added, so the lock file is unchanged.
- The gating was checked by reading the configuration, since no plan runs without AWS: the load balancer lookup's `count` and the alias records' `for_each` depend only on the records variable, and nothing else refers to the lookup. The first apply that waits for the certificate, and the second apply that adds the records, are ticket 08's.

### Agent usage (2026-10-22)

- Agent time: about 45 minutes, an estimate, summed over its implementer and its reviewer, plus an even share of the Terraform research, the review before the first apply, and the session that orchestrated the tickets.
- Tokens, with the same shares and the subagents included: input 346 new, 25.1 million read from the cache, and 727 thousand written to the cache; output 31 thousand.
