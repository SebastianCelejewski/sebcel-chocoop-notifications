terraform {
  backend "s3" {
    bucket         = "sebcel-chocoop-infra-tfstate"
    key            = "notifications/prod/terraform.tfstate"
    region         = "eu-central-1"
    dynamodb_table = "sebcel-chocoop-infra-locks"
    encrypt        = true
  }
}