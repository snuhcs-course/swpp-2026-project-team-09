################################################################################
# AI-generated with Claude
#
# 2026-10-22  Opus 5.5   prompted by fyoon46
# 2026-10-23  Opus 5.5   prompted by AhnJinYoung
################################################################################

locals {
  image_repositories = toset(["main-server", "socket-server", "worker-server", "admin"])
  ecr_registry       = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${local.region}.amazonaws.com"
}

data "aws_caller_identity" "current" {}

resource "aws_ecr_repository" "image" {
  for_each = local.image_repositories

  name = each.key
  # Images can be built again, so a move to another account or a teardown deletes them with their repository.
  force_delete = true
}

resource "aws_ecr_lifecycle_policy" "image" {
  for_each = aws_ecr_repository.image

  repository = each.value.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep the newest 10 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = {
        type = "expire"
      }
    }]
  })
}
