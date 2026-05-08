module "notifications" {
  source = "../../root"

  environment = "prod"
  aws_region  = "eu-central-1"
}