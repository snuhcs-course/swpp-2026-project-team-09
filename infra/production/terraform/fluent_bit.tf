################################################################################
# AI-generated with Claude
#
# 2026-11-23  Opus 5.5   prompted by TaeHyun79
# 2026-11-23  Fable 5.2  prompted by fyoon46
# 2026-11-23  Opus 5.5   prompted by TaeHyun79
################################################################################

# Fluent Bit posts the servers' warnings and errors to Slack. Reading the nodes' logs takes a hostPath volume, which
# snunow's Pod Security baseline forbids, so it has a namespace of its own, without that label.

locals {
  # The pipeline's test runs this tag too.
  fluent_bit_image_tag = "5.1.5"
  # Not named after the chart: Helm loads a local folder named like the chart before it looks in the repository.
  fluent_bit_pipeline = "${path.module}/fluent-bit-pipeline"
}

resource "kubernetes_namespace_v1" "logging" {
  metadata {
    name = "logging"
  }
}

# Fluent Bit takes no connection and reaches only DNS and the internet on 443, which is where Slack is: the same two
# rules as snunow's pods that go out. The kubelet's probes need no rule, since the VPC CNI lets a node reach its pods.
resource "kubernetes_network_policy_v1" "logging" {
  metadata {
    name      = "fluent-bit"
    namespace = kubernetes_namespace_v1.logging.metadata[0].name
  }

  spec {
    pod_selector {}
    policy_types = ["Ingress", "Egress"]

    egress {
      to {
        namespace_selector {
          match_labels = { "kubernetes.io/metadata.name" = "kube-system" }
        }
        pod_selector {
          match_labels = { "k8s-app" = "kube-dns" }
        }
      }
      ports {
        protocol = "UDP"
        port     = "53"
      }
      ports {
        protocol = "TCP"
        port     = "53"
      }
    }

    egress {
      to {
        ip_block {
          cidr   = "0.0.0.0/0"
          except = ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"]
        }
      }
      ports {
        protocol = "TCP"
        port     = "443"
      }
    }
  }
}

# Waits for a ready pod on each node, and a pod starts only once the Secret slack-webhooks, which a person makes so
# that the webhooks stay out of the state, holds every key below (infra/production/README.md: Server logs in Slack).
resource "helm_release" "fluent_bit" {
  name       = "fluent-bit"
  repository = "https://fluent.github.io/helm-charts"
  chart      = "fluent-bit"
  version    = "0.58.3"
  namespace  = kubernetes_namespace_v1.logging.metadata[0].name

  values = [yamlencode({
    image = {
      tag = local.fluent_bit_image_tag
    }
    testFramework = {
      enabled = false
    }
    # Without the chart's Kubernetes filter, Fluent Bit never calls the Kubernetes API.
    rbac = {
      create = false
    }
    serviceAccount = {
      create                       = false
      automountServiceAccountToken = false
    }
    resources = {
      requests = { memory = "32Mi" }
      limits   = { memory = "64Mi" }
    }
    # It runs as root, which owns the nodes' log files, and needs nothing more: it writes no file, and reading a file
    # as its owner takes no capability. The pipeline's test runs the image the same way.
    securityContext = {
      readOnlyRootFilesystem   = true
      allowPrivilegeEscalation = false
      capabilities             = { drop = ["ALL"] }
    }
    env = [
      {
        name      = "SLACK_WEBHOOK_MAIN_SERVER"
        valueFrom = { secretKeyRef = { name = "slack-webhooks", key = "main-server" } }
      },
      {
        name      = "SLACK_WEBHOOK_WORKER_SERVER"
        valueFrom = { secretKeyRef = { name = "slack-webhooks", key = "worker-server" } }
      },
      {
        name      = "SLACK_WEBHOOK_SOCKET_SERVER"
        valueFrom = { secretKeyRef = { name = "slack-webhooks", key = "socket-server" } }
      },
    ]
    # containerd's logs are under /var/log; the chart's default also mounts Docker's and /etc/machine-id.
    daemonSetVolumes      = [{ name = "varlog", hostPath = { path = "/var/log" } }]
    daemonSetVolumeMounts = [{ name = "varlog", mountPath = "/var/log", readOnly = true }]
    # The chart's default service section stays: it loads the parsers file with the json parser, and serves the
    # health check behind the probes.
    config = {
      inputs  = file("${local.fluent_bit_pipeline}/inputs.conf")
      filters = join("\n", [file("${local.fluent_bit_pipeline}/filters.conf"), file("${local.fluent_bit_pipeline}/server-filters.conf")])
      outputs = file("${local.fluent_bit_pipeline}/outputs.conf")
    }
  })]

  # It needs the nodes to run on, which the providers' settings do not wait for.
  # The policy is there before the first pod.
  depends_on = [module.eks, kubernetes_network_policy_v1.logging]
}
