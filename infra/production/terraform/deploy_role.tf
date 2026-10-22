################################################################################
# AI-generated with Claude
#
# 2026-10-22  Opus 5.5   prompted by fyoon46
################################################################################

# The role the Release workflow assumes through GitHub's OIDC provider, so that no AWS key is stored in GitHub.

locals {
  secret_parameter_path_arn = "arn:aws:ssm:${local.region}:${data.aws_caller_identity.current.account_id}:parameter/snunow/production"
}

resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
}

data "aws_iam_policy_document" "deploy_trust" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    # The repository uses GitHub's immutable subject claims, which carry the owner's and the repository's IDs.
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:snuhcs-course@139540821/swpp-2026-project-team-09@1374366029:ref:refs/tags/snunow-*"]
    }
  }
}

resource "aws_iam_role" "deploy" {
  name               = "${local.name}-deploy"
  assume_role_policy = data.aws_iam_policy_document.deploy_trust.json
}

data "aws_iam_policy_document" "deploy" {
  # The login token cannot be limited to repositories.
  statement {
    sid       = "EcrLogin"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  statement {
    sid = "EcrImages"
    actions = [
      "ecr:DescribeImages",
      "ecr:BatchGetImage",
      "ecr:BatchCheckLayerAvailability",
      "ecr:InitiateLayerUpload",
      "ecr:UploadLayerPart",
      "ecr:CompleteLayerUpload",
      "ecr:PutImage",
    ]
    resources = [for repository in aws_ecr_repository.image : repository.arn]
  }

  # For aws eks update-kubeconfig. What the role may do inside the cluster comes from its access entry.
  statement {
    sid       = "EksCluster"
    actions   = ["eks:DescribeCluster"]
    resources = [module.eks.cluster_arn]
  }

  # Production's secret values. GetParametersByPath is authorized against the requested path, the others against each
  # parameter. The AWS managed key aws/ssm lets every principal in the account decrypt, so no KMS permission is needed.
  statement {
    sid       = "SecretParameterPath"
    actions   = ["ssm:GetParametersByPath"]
    resources = [local.secret_parameter_path_arn]
  }

  statement {
    sid       = "SecretParameters"
    actions   = ["ssm:GetParameters", "ssm:GetParameter"]
    resources = ["${local.secret_parameter_path_arn}/*"]
  }
}

resource "aws_iam_role_policy" "deploy" {
  name   = "release"
  role   = aws_iam_role.deploy.id
  policy = data.aws_iam_policy_document.deploy.json
}
