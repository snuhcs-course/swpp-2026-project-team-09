################################################################################
# AI-generated with Claude
#
# 2026-10-22  Opus 5.5   prompted by fyoon46
################################################################################

locals {
  domain = "snunow.com"
}

# Registering the domain created this zone in account A, so Terraform only reads it.
data "aws_route53_zone" "snunow" {
  count = var.holds_zone ? 1 : 0

  name         = local.domain
  private_zone = false
}

resource "aws_acm_certificate" "hosts" {
  domain_name               = "api.${local.domain}"
  subject_alternative_names = ["admin.${local.domain}"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "certificate_validation" {
  for_each = var.holds_zone ? {
    for option in aws_acm_certificate.hosts.domain_validation_options : option.domain_name => option
  } : {}

  zone_id         = data.aws_route53_zone.snunow[0].zone_id
  name            = each.value.resource_record_name
  type            = each.value.resource_record_type
  records         = [each.value.resource_record_value]
  ttl             = 60
  allow_overwrite = true
}

# An account without the zone does not wait: the records from the certificate_validation_records output go into the
# zone by hand, and ACM issues the certificate once it sees them.
resource "aws_acm_certificate_validation" "hosts" {
  count = var.holds_zone ? 1 : 0

  certificate_arn         = aws_acm_certificate.hosts.arn
  validation_record_fqdns = [for record in aws_route53_record.certificate_validation : record.fqdn]
}

# The load balancer controller makes this ALB at the first Release, and a new one when the Ingresses are made again,
# so it is looked up by the tag it gives the IngressGroup, which infra/production/k8s names snunow.
data "aws_lb" "ingress" {
  count = var.enable_dns_records ? 1 : 0

  tags = {
    "ingress.k8s.aws/stack" = "snunow"
  }
}

resource "aws_route53_record" "ingress" {
  for_each = var.enable_dns_records ? toset(["api", "admin"]) : toset([])

  zone_id = data.aws_route53_zone.snunow[0].zone_id
  name    = "${each.key}.${local.domain}"
  type    = "A"

  alias {
    name                   = data.aws_lb.ingress[0].dns_name
    zone_id                = data.aws_lb.ingress[0].zone_id
    evaluate_target_health = true
  }
}
