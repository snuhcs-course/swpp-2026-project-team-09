################################################################################
# AI-generated with Claude
#
# 2026-10-22  Opus 5.5   prompted by fyoon46
################################################################################

locals {
  name      = "snunow"
  region    = "ap-northeast-2"
  azs       = ["${local.region}a", "${local.region}c"]
  namespace = "snunow"
}
