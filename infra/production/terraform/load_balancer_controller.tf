################################################################################
# AI-generated with Claude
#
# 2026-10-22  Opus 5.5   prompted by fyoon46
################################################################################

# IRSA, not EKS Pod Identity, whose agent would put one more pod on every node.
module "load_balancer_controller_irsa" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts"
  version = "6.8.2"

  name                                   = "${local.name}-load-balancer-controller"
  attach_load_balancer_controller_policy = true

  oidc_providers = {
    this = {
      provider_arn               = module.eks.oidc_provider_arn
      namespace_service_accounts = ["kube-system:aws-load-balancer-controller"]
    }
  }
}

resource "helm_release" "load_balancer_controller" {
  name       = "aws-load-balancer-controller"
  repository = "https://aws.github.io/eks-charts"
  chart      = "aws-load-balancer-controller"
  version    = "3.6.0"
  namespace  = "kube-system"

  values = [yamlencode({
    clusterName  = module.eks.cluster_name
    replicaCount = 1
    # The nodes' launch template keeps pods from reading instance metadata, where the controller would look these up.
    region = local.region
    vpcId  = module.vpc.vpc_id
    serviceAccount = {
      name = "aws-load-balancer-controller"
      annotations = {
        "eks.amazonaws.com/role-arn" = module.load_balancer_controller_irsa.arn
      }
    }
    # It only makes the controller the default for Services of type LoadBalancer, which Production has none of, and
    # with one replica it would block Service changes whenever that pod is down.
    enableServiceMutatorWebhook = false
  })]

  # The controller needs the nodes to run on, and the add-ons wait for the nodes.
  depends_on = [module.eks]
}
