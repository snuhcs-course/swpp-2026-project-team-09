# 06: The certificate and the DNS records

Parent: [A01 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01 (the root configuration)
Touches: `infra/production/terraform/` only, in files of its own beside the variables and outputs it adds.

## What to build

Terraform gives Production its HTTPS names (spec: "Entry: load balancer, domain, and certificate", and steps 2 and 7 of "Moving to account B"):

- **The zone** of `snunow.com` is read, never created or destroyed. Registering the domain created it in account A.
- **The certificate.** One ACM certificate for `api.snunow.com` and `admin.snunow.com`, validated by DNS. A variable says whether this account holds the zone. In account A, Terraform writes the validation records into the zone and waits until the certificate is issued. In account B, it requests the certificate without waiting and outputs the validation record to add to A's zone by hand.
- **The records.** A variable, off on the first apply, turns on the lookup of the ALB that the load balancer controller made for the IngressGroup `snunow`, found by its tag, and the alias records `api` and `admin` to it. An Ingress deleted and created again gives a new ALB, and the next apply points the records at it.

The controller finds the certificate from the Ingress hosts, so the manifests carry no certificate ARN.

## Acceptance criteria

- [ ] `terraform fmt -check` and `terraform validate` pass, locally and in the `terraform` CI job.
- [ ] With the records variable off, the configuration looks up no load balancer, so an apply works before any Ingress exists.
- [ ] In the account that holds the zone, the apply validates the certificate in the zone and waits for it; in the other account, it does not wait and outputs the validation record.
- [ ] The ALB is found by the IngressGroup's tag, never by a name or ARN written into the configuration.
- [ ] The hosted zone is only read.
- [ ] Every new or changed `.tf` file carries the `#` AI-generated box with a row for this change (`CLAUDE.md`).
- [ ] When done, the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.
