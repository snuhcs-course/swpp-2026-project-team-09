# 09: The account's owner plans and applies PR B's Terraform, in order

Parent: [A02 spec](../spec.md)
Status: ready-for-human
Blocked by: 04, 05, 06, 07

Native files: none. Releases: none; this is a `terraform apply` from the account owner's laptop.

**The webhook URL is a secret.** It never goes into chat, a pull request, an issue, a commit, a document, a configuration file, a test or a screenshot. A person reads it with `read -rs` and keeps it only in their password manager. It goes into the Secret only, never into Terraform, so neither the plan nor the state holds it.

## What to do

1. Sign in to account A (`aws login`) and initialize with the state backend, as the infra README's "Init, plan, and apply" describes.
2. On PR B's branch, run `terraform plan`. It must add one namespace and one Helm release, and change nothing else. Put its output in PR B's body.
3. Merge PR B into `5.0/Main` once it is approved.
4. On the merged commit, follow the order that ticket 04 wrote into the infra README's "First setup":
   1. `terraform apply -target` on the `logging` namespace;
   2. create the `slack-webhooks` Secret, its `main-server` key read with `read -rs`;
   3. a full `terraform apply`.

   Do not make the namespace by hand: Terraform would then fail to create it.

## Done when

- [ ] PR B's body holds the plan's output, which adds one namespace and one Helm release and changes nothing else.
- [ ] The full apply ends without an error.

## Comments
