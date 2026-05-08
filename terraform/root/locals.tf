locals {
  application = "sebcel-chocoop"

  common_tags = {
    application = local.application
    environment = var.environment
    owner       = "Sebastian.Celejewski@wp.pl"
    managed-by  = "terraform"
  }
}