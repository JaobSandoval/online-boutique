# Resolves the currently-active account id at plan/apply time, instead of
# hardcoding it. AWS Academy labs mint a NEW account (and new account id)
# every session, so a hardcoded value here would need manual edits in every
# file that referenced it — this is the whole reason main.tf's role_arn is
# built from this instead of a literal.
data "aws_caller_identity" "current" {}

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }

  filter {
    name   = "availability-zone"
    values = ["us-east-1a", "us-east-1b", "us-east-1c", "us-east-1d", "us-east-1f"]
  }
}