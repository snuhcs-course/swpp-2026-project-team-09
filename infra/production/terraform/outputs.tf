################################################################################
# AI-generated with Claude
#
# 2026-10-22  Opus 5.5   prompted by fyoon46
################################################################################

output "region" {
  description = "The Region, for the repository variable the Release workflow reads"
  value       = local.region
}

output "ecr_registry" {
  description = "The account's ECR registry host, for the repository variable the Release workflow reads"
  value       = local.ecr_registry
}

output "deploy_role_arn" {
  description = "The role the Release workflow assumes, for the repository variable it reads"
  value       = aws_iam_role.deploy.arn
}
