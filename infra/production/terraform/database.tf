################################################################################
# AI-generated with Claude
#
# 2026-10-22  Opus 5.5   prompted by fyoon46
################################################################################

# Letters and digits only, so that the password needs no escaping in a connection URL and avoids the characters RDS
# refuses.
resource "random_password" "database_master" {
  length  = 32
  special = false
}

resource "aws_security_group" "database" {
  name        = "${local.name}-database"
  description = "PostgreSQL from the cluster nodes"
  vpc_id      = module.vpc.vpc_id
}

# Pods use their node's security group, so this admits every pod and nothing outside the cluster.
resource "aws_vpc_security_group_ingress_rule" "database_from_nodes" {
  security_group_id            = aws_security_group.database.id
  referenced_security_group_id = module.eks.node_security_group_id
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
  description                  = "PostgreSQL from the cluster nodes"
}

resource "aws_db_instance" "database" {
  identifier     = local.name
  engine         = "postgres"
  engine_version = "18.6"
  instance_class = "db.t4g.micro"

  allocated_storage = 20
  storage_type      = "gp3"
  storage_encrypted = true

  username = "postgres"
  password = random_password.database_master.result

  db_subnet_group_name   = module.vpc.database_subnet_group_name
  vpc_security_group_ids = [aws_security_group.database.id]
  availability_zone      = local.azs[0]
  multi_az               = false
  publicly_accessible    = false

  # Also turns on point-in-time restore over the same 7 days. The API's default keeps 1 day.
  backup_retention_period = 7
  skip_final_snapshot     = false
  # Named after each instance's creation, so that a replaced or rebuilt instance never reuses an earlier snapshot's
  # name. ignore_changes keeps the name on later plans, but not when Terraform creates the instance.
  final_snapshot_identifier = "${local.name}-final-${formatdate("YYYYMMDDhhmmss", timestamp())}"

  lifecycle {
    # RDS upgrades the minor version by itself, and the plan would otherwise try to go back to this one.
    ignore_changes = [engine_version, final_snapshot_identifier]
  }
}
