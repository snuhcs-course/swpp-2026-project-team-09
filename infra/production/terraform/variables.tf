################################################################################
# AI-generated with Claude
#
# 2026-10-22  Opus 5.5   prompted by fyoon46
################################################################################

# Each account sets the variables that account.tfvars.example lists in its variables file, <account>.tfvars, which git
# ignores because it names people.

variable "team_member_iam_users" {
  description = "The names of the team members' IAM users in this account, each of which administers the cluster"
  type        = set(string)
}

variable "budget_alert_emails" {
  description = "The addresses that receive the budget's alerts"
  type        = list(string)

  validation {
    condition     = length(var.budget_alert_emails) >= 1 && length(var.budget_alert_emails) <= 10
    error_message = "A budget alert reaches between 1 and 10 email addresses."
  }
}

variable "holds_zone" {
  description = "Whether this account holds the snunow.com hosted zone, so that the apply validates the certificate in it and waits until it is issued"
  type        = bool
  default     = true
}

variable "enable_dns_records" {
  description = "Whether api and admin point at the load balancer of the IngressGroup snunow; off until the first Release has made it"
  type        = bool
  default     = false

  validation {
    condition     = !var.enable_dns_records || var.holds_zone
    error_message = "The records go in the hosted zone, so only the account that holds it turns them on."
  }
}

# Changed here, not in an account's variables file. EKS cannot change a node group's instance type in place, so a change
# replaces the node group: the new one is created before the old one is deleted.
variable "node_instance_type" {
  description = "The EC2 instance type of the cluster's two nodes"
  type        = string
  default     = "t4g.small"
}
