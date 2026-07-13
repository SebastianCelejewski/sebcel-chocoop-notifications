module "notifications" {
  source = "../../root"

  environment             = "prod"
  aws_region              = "eu-central-1"
  smtp_host               = "smtp.wp.pl"
  smtp_port               = 587
  smtp_from               = "Sebastian.Celejewski@wp.pl"
  base_url                = "chocoop.pl"
  notifications_enabled   = true
  cognito_user_pool_id    = "eu-central-1_XjLqCleRC"
  cognito_client_id       = "92abod6cpsikpd9nviavt8h3b"
}