# 02: The account's owner applies it at a quiet time and checks the nodes and pods

Parent: [A03 spec](../spec.md)
Status: ready-for-human
Blocked by: 01

Native files: none. Releases: none; this is a `terraform apply` from the account owner's laptop.

## What to do

Follow the infra README's "Replacing the nodes":

1. Pick a quiet time with no Release running or due in the next hour.
2. `terraform plan -var-file=account-a.tfvars`: two resources changed in place (the launch template's `volume_size` 20 → 40 and the node group's `launch_template` `version`), nothing added or destroyed.
3. `terraform apply -var-file=account-a.tfvars`, with `kubectl get nodes --watch` in a second terminal. It takes about 15 to 30 minutes.

## Done when

- [ ] Two nodes are Ready, both new, each with about 40 GiB of ephemeral storage.
- [ ] Every pod is Running and none is Pending, with one Fluent Bit pod on each node.
- [ ] The warn button on the admin site's Log test page posts to `#team9-main-server-error`.
- [ ] The next `all` Release leaves no node in DiskPressure (`kubectl describe node` shows no `NodeHasDiskPressure` event).

## Comments
