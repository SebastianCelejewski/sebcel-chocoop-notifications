module "notifications" {
  source = "../../root"

  environment             = "dev"
  aws_region              = "eu-central-1"
  notification_recipients = "Sebastian.Celejewski@wp.pl"
  smtp_host               = "smtp.wp.pl"
  smtp_port               = 587
  smtp_from               = "Sebastian.Celejewski@wp.pl"
  base_url                = "localhost:5173"
  notifications_enabled   = true
  cognito_user_pool_id    = "eu-central-1_LzqXzUmTz"
  cognito_client_id       = "7ja92s3bllddgg6nv7mur6ehv1"
}