################################################################################
# AI-generated with Claude
#
# 2026-11-23  Opus 5.5   prompted by TaeHyun79
################################################################################

# Fluent Bit posts the servers' warnings and errors to Slack, with the pipeline in fluent-bit/. Reading the nodes' logs
# takes a hostPath volume, which snunow's Pod Security baseline forbids, so it has a namespace of its own: no Pod
# Security label, no NetworkPolicy, and no rights for the Release workflow's deploy role.

locals {
  # The pipeline's test runs this tag too.
  fluent_bit_image_tag = "5.1.5"
}

resource "kubernetes_namespace_v1" "logging" {
  metadata {
    name = "logging"
  }
}

# Waits for a ready pod on each node, and a pod starts only once the Secret slack-webhooks, which a person makes so
# that the webhooks stay out of the state, holds every key below (infra README: Server logs in Slack).
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
    env = [
      {
        name      = "SLACK_WEBHOOK_MAIN_SERVER"
        valueFrom = { secretKeyRef = { name = "slack-webhooks", key = "main-server" } }
      },
    ]
    # containerd's logs are under /var/log; the chart's default also mounts Docker's and /etc/machine-id.
    daemonSetVolumes      = [{ name = "varlog", hostPath = { path = "/var/log" } }]
    daemonSetVolumeMounts = [{ name = "varlog", mountPath = "/var/log", readOnly = true }]
    # The chart's default service section stays: it loads the parsers file with the json parser, and serves the
    # health check behind the probes. The shared filters come before each server's own.
    config = {
      inputs  = file("${path.module}/fluent-bit/inputs.conf")
      filters = join("\n", [file("${path.module}/fluent-bit/filters.conf"), file("${path.module}/fluent-bit/server-filters.conf")])
      outputs = file("${path.module}/fluent-bit/outputs.conf")
    }
  })]

  # It needs the nodes to run on, which the providers' settings do not wait for.
  depends_on = [module.eks]
}
