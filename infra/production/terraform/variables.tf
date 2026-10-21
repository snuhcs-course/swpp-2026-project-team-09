################################################################################
# AI-generated with Claude
#
# 2026-10-22  Opus 5.5   prompted by fyoon46
################################################################################

# Each account sets these in its variables file, <account>.tfvars, which git ignores because it names people.

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
