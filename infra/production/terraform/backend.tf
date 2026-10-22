################################################################################
# AI-generated with Claude
#
# 2026-10-22  Opus 5.5   prompted by fyoon46
################################################################################

# Each account keeps its state in its own bucket, named in its <account>.s3.tfbackend file.
terraform {
  backend "s3" {
    key          = "production/terraform.tfstate"
    region       = "ap-northeast-2"
    use_lockfile = true
  }
}
