#!/usr/bin/env bash
################################################################################
# AI-generated with Claude
#
# 2026-10-22  Opus 5.5   prompted by fyoon46
# 2026-10-23  Opus 5.5   prompted by AhnJinYoung
################################################################################

# Runs all's NetworkPolicies in a throwaway k3s cluster in Docker, whose network policy controller enforces them, and
# tries every connection between stand-ins: allowed-connections.txt's must go through, and no other. Each Deployment
# becomes a busybox pod with its labels that listens on its ports, and the database Job, psql, and the P3009 copy are
# made as the runbook makes them. The load balancer, the database, another VPC address, and the internet are containers
# at network.tf's addresses, and pods get theirs from public subnet a. Needs docker, kubectl, jq, and rsync. It writes
# its own kubeconfig, never reads another, and removes the cluster and its networks when it exits. CI does not run it.
set -euo pipefail

k8s=$(cd "$(dirname "$0")/.." && pwd)
work=$(mktemp -d)
name=snunow-policies-$$
export KUBECONFIG=$work/kubeconfig
k3s_image=rancher/k3s:v1.36.5-k3s1
busybox=busybox:1.37.0
failures=0

cleanup() {
  docker rm -f "$name-node" "$name-load-balancer" "$name-database" "$name-vpc" "$name-internet" >/dev/null 2>&1 || true
  for network in public database vpc outside; do docker network rm "$name-$network" >/dev/null 2>&1 || true; done
  rm -rf "$work"
}
trap cleanup EXIT

check() {
  local name=$1
  shift
  if "$@"; then
    echo "ok: $name"
  else
    echo "not ok: $name"
    failures=$((failures + 1))
  fi
}

# Retries a command for up to a minute.
eventually() {
  for _ in $(seq 30); do
    if "$@" >/dev/null 2>&1; then return 0; fi
    sleep 2
  done
  return 1
}

docker network create --subnet 10.0.16.0/24 "$name-public" >/dev/null
docker network create --subnet 10.0.128.0/24 "$name-database" >/dev/null
docker network create --subnet 10.0.64.0/24 "$name-vpc" >/dev/null
docker network create --subnet 203.0.113.0/24 "$name-outside" >/dev/null

docker create --name "$name-node" --privileged --tmpfs /run --tmpfs /var/run \
  --network "$name-public" --ip 10.0.16.2 --publish 127.0.0.1::6443 "$k3s_image" server \
  --cluster-cidr 10.0.0.0/20 --service-cidr 10.100.0.0/16 --cluster-dns 10.100.0.10 --node-ip 10.0.16.2 \
  --tls-san 127.0.0.1 --disable traefik --disable servicelb --disable metrics-server --disable local-storage >/dev/null
docker network connect --ip 10.0.128.2 "$name-database" "$name-node"
docker network connect --ip 10.0.64.2 "$name-vpc" "$name-node"
docker network connect --ip 203.0.113.2 "$name-outside" "$name-node"
docker start "$name-node" >/dev/null

listener() {
  local container=$1 network=$2 address=$3 port command=''
  shift 3
  for port in "$@"; do command+="httpd -p $port -h /tmp; "; done
  docker run --detach --name "$container" --network "$network" --ip "$address" "$busybox" \
    sh -c "${command}exec sleep 86400" >/dev/null
}
listener "$name-database" "$name-database" 10.0.128.50 5432
listener "$name-vpc" "$name-vpc" 10.0.64.10 443 5432
listener "$name-internet" "$name-outside" 203.0.113.10 443 80
# With IP targets, the load balancer sends to the pods' own addresses.
docker run --detach --name "$name-load-balancer" --network "$name-public" --ip 10.0.16.100 --cap-add NET_ADMIN \
  "$busybox" sh -c 'ip route add 10.0.0.0/20 via 10.0.16.2 && exec sleep 86400' >/dev/null

eventually docker exec "$name-node" test -s /etc/rancher/k3s/k3s.yaml
port=$(docker port "$name-node" 6443/tcp | head -n 1 | sed 's/.*://')
docker exec "$name-node" cat /etc/rancher/k3s/k3s.yaml | sed "s#https://127.0.0.1:6443#https://127.0.0.1:$port#" \
  >"$KUBECONFIG"
docker save "$busybox" | docker exec --interactive "$name-node" ctr --namespace k8s.io images import - >/dev/null
eventually kubectl get serviceaccount default
kubectl wait --for=condition=Ready node --all --timeout=2m >/dev/null
kubectl --namespace kube-system wait --for=condition=Ready pod --selector k8s-app=kube-dns --timeout=2m >/dev/null

# As Terraform makes it.
kubectl create namespace snunow >/dev/null
kubectl label namespace snunow pod-security.kubernetes.io/enforce=baseline >/dev/null

mkdir -p "$work/k8s"
rsync -a --exclude secrets/ "$k8s/" "$work/k8s/"
mkdir -p "$work/k8s/parts/shared/secrets"
echo WORKER_TOKEN=stand-in >"$work/k8s/parts/shared/secrets/secrets.env"
echo stand-in >"$work/k8s/parts/shared/secrets/access-token-private-key.pem"
echo stand-in >"$work/k8s/parts/shared/secrets/access-token-public-key.pem"
kubectl kustomize "$work/k8s/targets/all" |
  kubectl patch --local --type merge --patch '{}' --filename - --output json |
  jq --slurp --arg busybox "$busybox" '{apiVersion: "v1", kind: "List", items: [.[]
    | select(.kind == "NetworkPolicy" or .kind == "Service" or .kind == "Deployment")
    | if .kind == "Deployment" then
        .spec.replicas = 1
        | .spec.template.spec |= {enableServiceLinks, terminationGracePeriodSeconds: 1,
            containers: [.containers[] | {name, image: $busybox, ports,
              command: ["sh", "-c", ([.ports[].containerPort | "httpd -p \(.) -h /tmp; "] | add) + "exec sleep 86400"]}]}
      else . end]}' |
  kubectl apply --filename - >/dev/null
kubectl patch --local --type merge --patch '{}' --filename "$k8s/database-setup.yaml" --output json |
  jq --arg busybox "$busybox" \
    '.spec.template.spec |= {restartPolicy, containers: [{name: "database-setup", image: $busybox, command: ["sleep", "86400"]}]}' |
  kubectl apply --filename - >/dev/null
kubectl --namespace snunow run psql --restart=Never --labels=database-client=true --image="$busybox" \
  --command -- sleep 86400 >/dev/null
kubectl --namespace snunow run shell --restart=Never --image="$busybox" \
  --command -- sh -c 'httpd -p 8080 -h /tmp; exec sleep 86400' >/dev/null
kubectl --namespace kube-system run other --restart=Never --image="$busybox" --command -- sleep 86400 >/dev/null
kubectl --namespace snunow wait --for=condition=Available deployment --all --timeout=2m >/dev/null
kubectl --namespace snunow debug \
  "$(kubectl --namespace snunow get pod --selector app=main-server --output name | head -n 1)" \
  --copy-to=prisma --container=main-server --profile=baseline -- sleep 86400 >/dev/null
kubectl --namespace snunow wait --for=condition=Ready pod --all --timeout=2m >/dev/null
kubectl --namespace kube-system wait --for=condition=Ready pod/other --timeout=2m >/dev/null

pod_of() {
  case $1 in
    'the database Job') kubectl --namespace snunow get pod --selector job-name=database-setup --output name | head -n 1 ;;
    psql) echo pod/psql ;;
    'the P3009 copy') echo pod/prisma ;;
    'a pod without a label') echo pod/shell ;;
    'a pod in kube-system') echo pod/other ;;
    *) kubectl --namespace snunow get pod --selector "app=$1" --output name | head -n 1 ;;
  esac
}

namespace_of() {
  if [[ $1 == 'a pod in kube-system' ]]; then echo kube-system; else echo snunow; fi
}

servers=(main-server socket-server worker-server admin redis)
pods_in_snunow=("${servers[@]}" 'the database Job' psql 'the P3009 copy' 'a pod without a label')
shell_address=$(kubectl --namespace snunow get pod shell --output jsonpath='{.status.podIP}')

# Destinations as "name|host|port|protocol". Pods are reached through their Services, as the servers reach them, and
# the load balancer reaches their own addresses.
destinations() {
  local via=$1 server
  for server in "${servers[@]}"; do
    local port
    port=$(kubectl --namespace snunow get service "$server" --output jsonpath='{.spec.ports[0].port}')
    if [[ $via == service ]]; then
      echo "$server|$server.snunow.svc.cluster.local|$port|TCP"
    else
      echo "$server|$(kubectl --namespace snunow get "$(pod_of "$server")" --output jsonpath='{.status.podIP}')|$port|TCP"
    fi
  done
  echo "a pod without a label|$shell_address|8080|TCP"
}

service_destinations=$(destinations service)
pod_destinations=$(destinations pod)

outside_destinations() {
  printf '%s\n' 'CoreDNS|10.100.0.10|53|UDP' 'CoreDNS|10.100.0.10|53|TCP' \
    'the database in zone a|10.0.128.50|5432|TCP' 'another address in the VPC|10.0.64.10|443|TCP' \
    'another address in the VPC|10.0.64.10|5432|TCP' 'the internet|203.0.113.10|443|TCP' 'the internet|203.0.113.10|80|TCP'
}

# A shell script that tries each destination at once and prints those it reached, as "name port/protocol".
probe_script() {
  local source=$1 name host port protocol
  cat <<'SCRIPT'
probe() {
  if [ "$4" = UDP ]; then timeout 3 nslookup kubernetes.default.svc.cluster.local "$2"
  else nc -w 2 "$2" "$3" </dev/null; fi >/dev/null 2>&1 && echo "$1 $3/$4"
}
SCRIPT
  while IFS='|' read -r name host port protocol; do
    [[ $name == "$source" ]] && continue
    echo "probe '$name' $host $port $protocol &"
  done
  echo wait
}

# The connections that the source reaches, as allowed-connections.txt writes them.
reached_from() {
  local source=$1
  if [[ $source == 'the load balancer' ]]; then
    echo "$pod_destinations" | probe_script "$source" | docker exec --interactive "$name-load-balancer" sh
  elif [[ $source == 'a pod in kube-system' ]]; then
    echo "$service_destinations" | probe_script "$source" |
      kubectl --namespace kube-system exec --stdin pod/other -- sh
  else
    { echo "$service_destinations"; outside_destinations; } | probe_script "$source" |
      kubectl --namespace "$(namespace_of "$source")" exec --stdin "$(pod_of "$source")" -- sh
  fi | sed "s/^/$source -> /"
}

# What allowed-connections.txt allows among the pairs that the cluster tries.
expected_from() {
  local source=$1 line
  local tried
  if [[ $source == 'the load balancer' || $source == 'a pod in kube-system' ]]; then
    tried=$service_destinations
  else
    tried=$({ echo "$service_destinations"; outside_destinations; })
  fi
  while IFS='|' read -r name _ port protocol; do
    [[ $name == "$source" ]] && continue
    line="$source -> $name $port/$protocol"
    if grep -Fxq "$line" "$k8s/test/allowed-connections.txt"; then echo "$line"; fi
  done <<<"$tried"
}

the_copy_reaches_the_database() {
  kubectl --namespace snunow exec pod/prisma -- nc -w 2 10.0.128.50 5432 </dev/null
}

refuses_the_copy_before_its_label() {
  ! the_copy_reaches_the_database >/dev/null 2>&1
}

# The controller has applied the policies once a pod with no allowance is refused and one with an allowance is not.
eventually sh -c "! kubectl --namespace snunow exec pod/shell -- nc -w 2 10.0.128.50 5432 </dev/null"
eventually kubectl --namespace snunow exec pod/psql -- nc -w 2 10.0.128.50 5432

check "the P3009 copy, before its label, cannot reach the database" refuses_the_copy_before_its_label
# As the runbook labels it.
kubectl --namespace snunow label pod prisma database-client=true >/dev/null
check "the P3009 copy, once labelled, reaches the database" eventually the_copy_reaches_the_database

sources=("${pods_in_snunow[@]}" 'a pod in kube-system' 'the load balancer')
for source in "${sources[@]}"; do
  reached_from "$source" >"$work/reached-$(echo "$source" | tr ' ' '-')" &
done
wait
for source in "${sources[@]}"; do
  reaches_what_the_list_allows() {
    diff <(expected_from "$source" | sort) <(sort "$work/reached-$(echo "$source" | tr ' ' '-')")
  }
  check "$source reaches exactly what allowed-connections.txt allows it" reaches_what_the_list_allows
done

if ((failures > 0)); then
  echo "$failures failed"
  exit 1
fi
