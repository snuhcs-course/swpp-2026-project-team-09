################################################################################
# AI-generated with Claude
#
# 2026-10-22  Opus 5.5   prompted by fyoon46
################################################################################

# Records the first apply's time in the state, so that later applies keep the budget's start.
resource "time_static" "budget_start" {}

resource "aws_budgets_budget" "spend" {
  name         = local.name
  budget_type  = "COST"
  limit_amount = "300"
  limit_unit   = "USD"

  # One period that never resets. AWS excludes the end date, so the period covers 2026-12-31.
  time_unit         = "CUSTOM"
  time_period_start = formatdate("YYYY-MM-DD_00:00", time_static.budget_start.rfc3339)
  time_period_end   = "2027-01-01_00:00"

  # Counts gross spend, so that the alerts come while credits still pay.
  cost_types {
    include_credit = false
  }

  dynamic "notification" {
    for_each = [50, 100, 150, 200, 250, 300]

    content {
      notification_type          = "ACTUAL"
      comparison_operator        = "GREATER_THAN"
      threshold                  = notification.value
      threshold_type             = "ABSOLUTE_VALUE"
      subscriber_email_addresses = var.budget_alert_emails
    }
  }
}
