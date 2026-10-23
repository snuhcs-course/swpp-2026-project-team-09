---
status: accepted
---

# The course servers run Docker Compose, not Kubernetes

The team meant to run the servers on Kubernetes on the course machines. Those machines turned out to be unprivileged Incus (LXC) containers, not virtual machines: there is no `/dev/kmsg`, no `/lib/modules`, the host has not loaded `br_netfilter` or `vxlan`, the cgroup tree delegates only cpu, memory and pids, and a seccomp filter is on. k3s, k0s and kind all need two or more of these, and only the course staff can change the container's profile. Docker works: overlayfs mounts succeed and the staff recommend it.

The Dev Server therefore runs the laptop `compose.yaml` with a deployment override: a reverse proxy on port 80, the servers' settings from files outside the checkout, and restart policies. The pieces that Kubernetes would also use are kept as they are: the four Dockerfiles, the settings read from the environment, the health routes, the one-hostname path routing (`/socket.io/` to the socket server, the rest to the main server) and the pull model of ADR 0003. Moving to Kubernetes later means translating the Compose services into manifests and the volume into a claim, not redesigning the system.

## Consequences

- The course servers get nothing k8s-specific (Helm charts, manifests, operators) unless their container profile changes. Production runs on Kubernetes in AWS instead, with manifests of its own (ADR 0006).
- Compose's `depends_on` ordering does not exist in Kubernetes, so a start-up step that assumes the database is ready (the migration at the main and match servers' start) needs a retry or an init container there. The match server was later removed (ADR 0007).
