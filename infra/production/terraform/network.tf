################################################################################
# AI-generated with Claude
#
# 2026-10-22  Opus 5.5   prompted by fyoon46
################################################################################

# No NAT gateway: the nodes sit in the public subnets, and their own public IPv4 addresses reach ECR and the internet.
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "6.7.3"

  name = local.name
  cidr = "10.0.0.0/16"
  azs  = local.azs

  public_subnets          = ["10.0.0.0/20", "10.0.16.0/20"]
  map_public_ip_on_launch = true
  public_subnet_tags = {
    "kubernetes.io/role/elb" = "1"
  }

  # Their own route tables hold only the VPC's local route.
  database_subnets                   = ["10.0.128.0/24", "10.0.129.0/24"]
  create_database_subnet_route_table = true

  enable_nat_gateway = false
}
