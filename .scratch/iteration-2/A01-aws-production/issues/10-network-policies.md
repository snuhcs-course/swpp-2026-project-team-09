# 10: NetworkPolicies from a default deny

Parent: [A01 spec](../spec.md)
Status: resolved
Blocked by: 09
Touches: `infra/production/k8s/` (the policies in the parts, the database Job's labels, and `test/`), and in `infra/production/README.md` the commands for the pods started by hand and the "Network policies" section. Not Terraform: `cluster.tf` already turns on the VPC CNI's enforcement. Not the Release workflow (ticket 05), which applies the policies with each target.

## What to build

Production follows AWS's EKS Best Practices for network security from the first Release: every pod in `snunow` starts from a default deny of both ingress and egress, and NetworkPolicies allow exactly the traffic each workload needs (spec: "Network policies" under "Workloads").

- **The allow-list.** Every connection that each server opens and accepts, read from its code and settings: the other servers through their `*_URL` settings, Redis, PostgreSQL, the external APIs and sites, and DNS. The matrix goes in `## Comments`.
- **The allowances.**
  - Into `main-server`, `socket-server`, and `admin`: the load balancer, which uses IP targets, by the public subnets' CIDRs from `network.tf`, on their container ports.
  - Between the servers and to Redis: only where the code calls.
  - To the database subnets' CIDRs on 5432: only `main-server` and `match-server`.
  - To CoreDNS in `kube-system` on 53, over TCP and UDP: every pod.
  - To the internet, `0.0.0.0/0` except the VPC's CIDR: only the servers that call outside.
  - Whatever else a default deny would break, such as the kubelet's probes and the load balancer's health checks, checked against the VPC CNI's documentation.
- **Pods started by hand.** The database Job, the runbook's psql pod, and the copy of a server's pod that resolves a P3009 keep working: they carry a label that the policies allow, and the Job and the runbook's commands give it.
- **Placement.** The default deny, DNS, and the other shared policies in `parts/shared`, and each server's own policy in its part, so that every target renders the policies it needs and only namespaced objects.
- **Tests,** written first. The render of every target is checked for the policies, parsed and never as a file's text, and CI's `manifests` job keeps running it. The policies also run in a throwaway local cluster that enforces them, with stand-in pods labelled like each workload.

## Acceptance criteria

- [x] `## Comments` holds the matrix of every connection that each server opens and accepts, with where the code opens it.
- [x] `default-deny` selects every pod in `snunow` for both ingress and egress, and every target renders it.
- [x] The load balancer reaches `main-server` on 3000, `socket-server` on 3001, and `admin` on 3100, by the public subnets' CIDRs `10.0.0.0/20` and `10.0.16.0/20`.
- [x] Between pods, only the code's calls are allowed: the admin site, the worker, and the match server to `main-server` on 3000; `main-server` to `match-server` on 3003; `main-server` and `socket-server` to Redis on 6379.
- [x] Only `main-server`, `match-server`, and pods labelled `database-client: "true"` reach the database subnets `10.0.128.0/24` and `10.0.129.0/24`, on 5432 only.
- [x] Every pod reaches CoreDNS (`k8s-app: kube-dns` in `kube-system`) on 53, over UDP and TCP.
- [x] Only `main-server`, `worker-server`, and the database Job reach the internet, as `0.0.0.0/0` except the VPC's `10.0.0.0/16`, on 443 only.
- [x] The kubelet's probes and the load balancer's health checks still reach the pods, each by a documented rule.
- [x] The database Job, the runbook's psql pod, and the P3009 copy carry `database-client: "true"`, and the Job also `app: database-setup`. The Job's pod template and the runbook's commands give them.
- [x] The shared policies are in `parts/shared` and each server's in its part. Every target renders the shared policies and its servers' own, each the same object as in `all`, and only namespaced objects in `snunow`.
- [x] `infra/production/k8s/test/targets.sh` checks every target's policies on the parsed render, and CI's `manifests` job runs it. The policies also ran in a throwaway k3s cluster with stand-ins, and every pair of endpoints behaved as listed.
- [x] The spec has a "Network policies" part under "Workloads" and in its Testing Decisions. Tickets 07 and 08 are blocked by 10. Ticket 08 checks that the system works under the policies and that a pod without an allowance cannot reach the database. Ticket 07's runbook items cover the labels of the pods started by hand.
- [x] Every new or changed source file carries the `#` AI-generated box with a row for this change (`CLAUDE.md`). Markdown and `allowed-connections.txt`, a test fixture, get none.
- [x] When done, the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.

## Comments

### The allow-list from the code (2026-10-22)

What each workload accepts and opens. No server opens anything else: no server has another `*_URL` setting, and none depends on an SDK for another service. Paths are in each server's folder.

| Workload | Accepts | Opens |
|---|---|---|
| `main-server` | 3000: phones through the load balancer (`api.snunow.com`, except `/socket.io` and the refused `/admin`); the admin site (`admin/src/main-server.ts` and its `/health/ready`), the worker (`worker-server/src/common/main-server.ts`), and the match server (`match-server/src/matching/main-server.ts`), each at `MAIN_SERVER_URL` | PostgreSQL at `DATABASE_URL`, RDS on 5432, with `prisma migrate deploy` and the seed at start; Redis at `REDIS_HOST` and `REDIS_PORT` (`src/common/redis.module.ts`, and NestJS messaging in `src/common/messaging.ts`); the match server at `MATCH_SERVER_URL` (`src/matching/match-server.ts`); on 443: `dapi.kakao.com` (`src/walking-route/walking-route.service.ts`), Google's ID-token keys at `www.googleapis.com` (`OAuth2Client.verifyIdToken` in `src/auth/google-auth-library.verifier.ts`), and `openrouter.ai` (`@openrouter/ai-sdk-provider` in `src/assistant/adapter.ts`) |
| `socket-server` | 3001: phones' WebSockets through the load balancer (`/socket.io`) | Redis (`src/common/messaging.ts`) |
| `worker-server` | 3002: nothing but the kubelet's probes | the main server at `MAIN_SERVER_URL` (`src/common/main-server.ts`); on 443: `www.snu.ac.kr` (`src/event/events-list.ts`), `snuco.snu.ac.kr`, `snudorm.snu.ac.kr`, and `vet.snu.ac.kr` (`src/menu/menu.collector.ts`), and `web.busin.co.kr` (`src/shuttle/shuttle.collector.ts`) |
| `match-server` | 3003: the main server at `MATCH_SERVER_URL` | the main server at `MAIN_SERVER_URL` (`src/matching/main-server.ts`); PostgreSQL at `DATABASE_URL` (`src/common/prisma.service.ts`, and `pnpm db:migrate` at start) |
| `admin` | 3100: browsers through the load balancer (`admin.snunow.com`) | the main server at `MAIN_SERVER_URL` (`src/main-server.ts`, `src/app/health/ready/route.ts`). Google's sign-in script and Kakao's map SDK load in the browser, not from the pod. |
| `redis` | 6379: `main-server` and `socket-server` | nothing |
| The database Job | nothing | `truststore.pki.rds.amazonaws.com` on 443 (its `curl` init container); RDS on 5432 (`psql`) |
| psql, from the runbook | nothing | RDS on 5432 |
| The P3009 copy | nothing | RDS on 5432 (`prisma migrate status` and `resolve`) |
| Every pod | | CoreDNS for the names above |

Each Source's collection run by hand (`node dist/collect` through `kubectl exec`) runs in the worker's pod, so it has the worker's allowances. A port forward reaches the pod through its node, not over the pod network.

### Built (2026-10-22)

- **Shared policies** in `infra/production/k8s/parts/shared/network-policies.yaml`:

  | Name | Selects | Allows |
  |---|---|---|
  | `default-deny` | every pod | nothing, in either direction |
  | `dns` | every pod | out to `k8s-app: kube-dns` in `kube-system` on 53, UDP and TCP |
  | `redis` | `app: redis` | in from `app` `main-server` or `socket-server` on 6379; out nothing more |
  | `database-client` | `database-client: "true"` | out to `10.0.128.0/24` and `10.0.129.0/24` on 5432 |
  | `database-setup` | `app: database-setup` | out to `0.0.0.0/0` except `10.0.0.0/16` on 443 |

- **Each server's policy** in `parts/<server>/network-policy.yaml`, named after the server and selecting `app: <server>`, for both directions:

  | Name | In | Out |
  |---|---|---|
  | `main-server` | `10.0.0.0/20`, `10.0.16.0/20`, and `app` `admin`, `worker-server`, or `match-server`, on 3000 | Redis on 6379, `match-server` on 3003, the database subnets on 5432, the internet on 443 |
  | `socket-server` | `10.0.0.0/20` and `10.0.16.0/20` on 3001 | Redis on 6379 |
  | `worker-server` | nothing | `main-server` on 3000, the internet on 443 |
  | `match-server` | `main-server` on 3003 | `main-server` on 3000, the database subnets on 5432 |
  | `admin` | `10.0.0.0/20` and `10.0.16.0/20` on 3100 | `main-server` on 3000 |

  Each part's kustomization lists its file, and the shared kustomization lists the shared one. Every target renders the five shared policies and its servers' own; `all` renders all ten. No server's Deployment changed, since the policies select the `app` labels the pods already carry.
- **The internet on 443 only.** Every external call in the code is `https`, so port 80 and the instance metadata service stay closed.
- **Pods started by hand.**
  - The database Job's pod template carries `app: database-setup` and `database-client: "true"`.
  - The runbook's psql command adds `--labels=database-client=true`.
  - `kubectl debug --copy-to` keeps none of the pod's labels (`--keep-labels` is false by default), which keeps Services and the ReplicaSet away from the copy. So the runbook now makes the copy sleeping, labels it `database-client=true`, waits until it is ready, and opens the shell with `kubectl exec`.
  - The runbook gains a "Network policies" section, which ticket 07 keeps in step.
- **What the VPC CNI's documentation says, and what follows** (EKS user guide, "Limit Pod traffic with Kubernetes network policies" and "Restrict Pod network traffic"; EKS Best Practices, "Network security"):
  - **Probes.** With a policy for ingress, the pod still accepts connections from its own node. So the kubelet's probes need no rule.
  - **Load balancer.** The ALB's health checks come from its own addresses in the public subnets, like its traffic, and the load balancer's rule admits them. Without that rule, the readiness gates would never pass and every rollout would stall.
  - **Services.** The Service port must equal the container port. Every Service here keeps that, and the render test checks it.
  - **Standalone pods.** Enforcement "might not work reliably" for pods that no controller owns, which psql and the P3009 copy are. They carry the label all the same, and ticket 08 checks that psql without it is refused.
  - **Standard mode.** A new pod allows everything until its policies are configured, a matter of seconds. Strict mode, which would also need policies for CoreDNS's own pods, is not turned on.
  - **Limits.** At most 24 port and protocol pairs per CIDR across all policies; these use at most three per CIDR.
- **Shared subnets.** The VPC CNI gives pods addresses in the public subnets, the same as the load balancer's. So the load balancer's rule also admits pods on `main-server`'s, `socket-server`'s, and `admin`'s ports. Inside `snunow`, a pod still needs its own egress allowance to get there. A pod in another namespace, such as one in `kube-system`, has no policy limiting its egress, so it reaches those three ports. Narrowing that would need pods in their own subnets (custom networking) or security groups for pods, which the `t` instances lack. `allowed-connections.txt` lists these connections, so the tests show them.

### How each criterion was checked (2026-10-22)

- **Test first.** Each check was added to `infra/production/k8s/test/targets.sh` and failed before the objects or rules that pass it existed. First: every target renders the shared policies and its servers' own. Then: `all`'s policies allow exactly the listed connections. The second failed with every connection refused under the bare default deny. Then it failed only on the Job, until the Job's pod template got its labels.
- **The render test** (`targets.sh`, 45 checks, all passing; CI's `manifests` job runs it unchanged):
  - The object list of every target now includes its NetworkPolicies, compared by kind and name.
  - Each server target's policies are the same objects as in `all`.
  - Every object is in `snunow`.
  - `allows.jq` evaluates `all`'s policies by Kubernetes' rules on the parsed render, covering `matchLabels`, `matchExpressions`, namespace selectors, `ipBlock` with `except`, ports, protocols, and policy types. A connection needs both the source's egress and the destination's ingress. It prints every allowed connection among the endpoints: the six Deployments with their rendered labels and ports; the database Job's pod, with the labels of `database-setup.yaml` parsed; psql; the P3009 copy; a pod without a label; a pod in `kube-system`; CoreDNS; the load balancer; the database in each database subnet; another VPC address; the internet on 443 and 80; and the instance metadata service. The result must equal `test/allowed-connections.txt`, the matrix above written out.
  - Every Service's port equals the container port it targets.
- **The checks can fail.** Each of these mutations on a copy failed the matching check:
  - DNS with the wrong label;
  - `main-server`'s port changed;
  - the internet rule without its VPC exception;
  - `match-server` without zone c's subnet;
  - `admin`'s egress to a wrong label;
  - the Job without `database-client`;
  - Redis's Service on a port its pod does not use;
  - a named port;
  - `default-deny` without Ingress, once the unlabelled stand-in pod listens on a port.

  `default-deny` without Egress changes nothing, since `dns` already selects every pod for egress.
- **The local cluster** (`infra/production/k8s/test/cluster.sh`, run by hand, 14 checks, all passing in 47 seconds):
  - k3s v1.36.5 runs in Docker, with its built-in network policy controller, its own kubeconfig file, and the namespace labelled for Pod Security's baseline as Terraform does. The cluster and its networks are removed on exit; none were left behind.
  - Pods get addresses from `10.0.0.0/20`, as the VPC CNI gives them in public subnet a. The load balancer, the database, another VPC address, and the internet are busybox containers on Docker networks at `10.0.16.100`, `10.0.128.50`, `10.0.64.10`, and `203.0.113.10`. The load balancer sends to the pods' own addresses, as IP targets do.
  - `all`'s Services and policies are applied as rendered. Each Deployment becomes a busybox pod with its labels that listens on its ports. The database Job keeps its pod template's labels. psql is made with the runbook's `kubectl run --labels=database-client=true`, and the P3009 copy with the runbook's `kubectl debug --copy-to … --profile=baseline` and `kubectl label`.
  - From every pod and the load balancer, each destination is tried at once: Services by name, the database, the VPC address, the internet on 443 and 80, and CoreDNS over UDP and TCP. Each source reached exactly what `allowed-connections.txt` allows it, among the pairs the cluster can try.
  - The copy was refused by the database before its label and reached it after.
  - A mutated run, with Redis closed to `socket-server` and DNS over UDP removed, failed eight checks.
- **Not checkable without AWS.** The VPC CNI's own enforcement, the ALB's health checks, the readiness gates, and enforcement on standalone pods come with the first Release. Ticket 08 checks them.
- **Boxes.** The new policy files, `allows.jq`, and `cluster.sh` carry the box with this change's row. The changed kustomizations, `targets.sh`, and `database-setup.yaml` already had it. `allowed-connections.txt` is a test fixture and gets none.
- **After merging the iteration branch** (with ticket 03's steps by hand), the render test passed again, from the working tree and from a clean clone, and so did the local cluster, in 56 seconds.

### Agent usage (2026-10-22)

- Agent time: about 30 minutes, an estimate, for one implementing agent.
- Tokens: input 140 new, 13.6 million read from the cache, and 300 thousand written to the cache; output 33 thousand.
