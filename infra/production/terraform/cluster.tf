################################################################################
# AI-generated with Claude
#
# 2026-10-22  Opus 5.5   prompted by fyoon46
################################################################################

data "aws_iam_user" "team_member" {
  for_each = var.team_member_iam_users

  user_name = each.key
}

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "21.29.0"

  name               = local.name
  kubernetes_version = "1.37"
  # Without this, EKS moves a cluster whose version leaves standard support to extended support, which costs more.
  upgrade_policy = {
    support_type = "STANDARD"
  }

  endpoint_public_access = true
  authentication_mode    = "API"

  enabled_log_types           = []
  create_cloudwatch_log_group = false
  # Only a null encryption_config stops the module from encrypting Secrets with a key of its own.
  encryption_config = null
  create_kms_key    = false

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.public_subnets

  # No eks-pod-identity-agent: it would add a pod to every node, and the load balancer controller uses IRSA instead.
  addons = {
    vpc-cni = {
      before_compute = true
    }
    coredns        = {}
    kube-proxy     = {}
    metrics-server = {}
  }

  eks_managed_node_groups = {
    default = {
      ami_type       = "AL2023_ARM_64_STANDARD"
      instance_types = [var.node_instance_type]
      capacity_type  = "ON_DEMAND"

      # The module ignores later changes to desired_size, so min_size and max_size hold the count.
      min_size     = 2
      max_size     = 2
      desired_size = 2

      # The module's launch template ignores disk_size.
      block_device_mappings = {
        xvda = {
          device_name = "/dev/xvda"
          ebs = {
            volume_size           = 20
            volume_type           = "gp3"
            encrypted             = true
            delete_on_termination = true
          }
        }
      }

      node_repair_config = {
        enabled = true
      }
    }
  }

  # The module never adds whoever applies, so every team member who applies must be among these entries.
  access_entries = merge(
    {
      for user_name, user in data.aws_iam_user.team_member : user_name => {
        principal_arn = user.arn
        policy_associations = {
          cluster_admin = {
            policy_arn = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"
            access_scope = {
              type = "cluster"
            }
          }
        }
      }
    },
    {
      deploy = {
        principal_arn = aws_iam_role.deploy.arn
        policy_associations = {
          namespace_admin = {
            policy_arn = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSAdminPolicy"
            access_scope = {
              type       = "namespace"
              namespaces = [local.namespace]
            }
          }
        }
      }
    },
  )
}
