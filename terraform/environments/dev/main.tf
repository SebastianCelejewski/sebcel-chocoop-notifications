module "notifications" {
  source = "../../root"

  environment             = "dev"
  aws_region              = "eu-central-1"
  notification_recipients = "Sebastian.Celejewski@wp.pl"
  smtp_host               = "smtp.wp.pl"
  smtp_port               = 587
  smtp_from               = "Sebastian.Celejewski@wp.pl"
  base_url                = "localhost:5173"
}