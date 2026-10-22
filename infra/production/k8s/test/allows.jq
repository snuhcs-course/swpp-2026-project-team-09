################################################################################
# AI-generated with Claude
#
# 2026-10-22  Opus 5.5   prompted by fyoon46
################################################################################

# Reads a render, as a JSON array, and prints each connection that its NetworkPolicies allow, by Kubernetes' rules,
# among the endpoints: the render's Deployments, the pod of the Job $job[0], and $others. An endpoint is a pod, with a
# namespace and labels, or an address outside the cluster. Pods get addresses in a public subnet, as the VPC CNI gives
# them. A pair with no end in snunow is left out, since no policy here governs it.

def address_number: split(".") | map(tonumber) | .[0] * 16777216 + .[1] * 65536 + .[2] * 256 + .[3];

def within($cidr):
  ($cidr | split("/")) as [$network, $bits]
  | pow(2; 32 - ($bits | tonumber)) as $size
  | (address_number / $size | floor) == ($network | address_number / $size | floor);

def selects($labels):
  all((.matchLabels // {}) | to_entries[]; $labels[.key] == .value)
  and all((.matchExpressions // [])[];
    . as $expression
    | if .operator == "In" then any(.values[]; . == $labels[$expression.key])
      elif .operator == "NotIn" then all(.values[]; . != $labels[$expression.key])
      elif .operator == "Exists" then $labels | has($expression.key)
      elif .operator == "DoesNotExist" then $labels | has($expression.key) | not
      else error("unknown operator \(.operator)") end);

# Whether a rule's peer, in a policy of $namespace, covers $end.
def admits($namespace; $end):
  . as $peer
  | if $peer.ipBlock then
      ($end.ip | within($peer.ipBlock.cidr)) and all(($peer.ipBlock.except // [])[]; . as $cidr | $end.ip | within($cidr) | not)
    elif $end.namespace == null then false
    else
      (if $peer.namespaceSelector then $peer.namespaceSelector | selects({"kubernetes.io/metadata.name": $end.namespace})
       else $end.namespace == $namespace end)
      and (($peer.podSelector // {}) | selects($end.labels))
    end;

def opens($port; $protocol):
  (.ports // []) as $ports
  | ($ports | length) == 0
    or any($ports[];
      if (.port | type) == "string" then error("named ports are not evaluated: \(.port)") else . end
      | (.protocol // "TCP") == $protocol and (.port == null or (.port <= $port and $port <= (.endPort // .port))));

def policy_types: .spec.policyTypes // (["Ingress"] + (if .spec.egress then ["Egress"] else [] end));

# Whether the policies that select $self let it send to $other (Egress) or receive from $other (Ingress).
def lets($policies; $direction; $self; $other; $port; $protocol):
  ($direction | ascii_downcase) as $rules
  | (if $direction == "Egress" then "to" else "from" end) as $peers
  | [$policies[]
      | select(.metadata.namespace == $self.namespace and (.spec.podSelector | selects($self.labels)))
      | select(any(policy_types[]; . == $direction))]
  | length == 0
    or any(.[];
      .metadata.namespace as $namespace
      | any((.spec[$rules] // [])[];
          ((.[$peers] // []) | length == 0 or any(.[]; admits($namespace; $other))) and opens($port; $protocol)));

[.[] | select(.kind == "NetworkPolicy")] as $policies
| [(.[] | select(.kind == "Deployment")
    | {name: .metadata.name, namespace: .metadata.namespace, labels: .spec.template.metadata.labels,
       ports: [.spec.template.spec.containers[].ports[]? | [.containerPort, (.protocol // "TCP")]]}),
   ($job[0] | {name: "the database Job", namespace: .metadata.namespace,
     labels: ((.spec.template.metadata.labels // {}) + {"batch.kubernetes.io/job-name": .metadata.name, "job-name": .metadata.name})}),
   $others[]]
| to_entries
| map(.value + if .value.namespace != null and .value.ip == null then {ip: "10.0.2.\(10 + .key)"} else {} end)
| . as $ends
| $ends[] as $from
| $ends[] as $to
| ($to.ports // [])[] as [$port, $protocol]
| select($from.namespace == "snunow" or $to.namespace == "snunow")
| select(lets($policies; "Egress"; $from; $to; $port; $protocol) and lets($policies; "Ingress"; $to; $from; $port; $protocol))
| "\($from.name) -> \($to.name) \($port)/\($protocol)"
