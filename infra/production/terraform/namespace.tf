################################################################################
# AI-generated with Claude
#
# 2026-10-22  Opus 5.5   prompted by fyoon46
################################################################################

# Terraform makes the namespace because the deploy role's rights stop inside it. The controller injects readiness gates
# only into pods created after the label is there, so the label comes with the namespace.
resource "kubernetes_namespace_v1" "app" {
  metadata {
    name = local.namespace
    labels = {
      "elbv2.k8s.aws/pod-readiness-gate-inject" = "enabled"
    }
  }

  # On destroy, the namespace goes while the controller still runs to delete the Ingresses' load balancer.
  depends_on = [helm_release.load_balancer_controller]
}
