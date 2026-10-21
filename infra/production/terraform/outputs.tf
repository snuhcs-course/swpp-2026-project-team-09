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

output "certificate_validation_records" {
  description = "The certificate's DNS validation records by domain name, which an account without the zone adds to it by hand"
  value = {
    for option in aws_acm_certificate.hosts.domain_validation_options : option.domain_name => {
      name  = option.resource_record_name
      type  = option.resource_record_type
      value = option.resource_record_value
    }
  }
}
