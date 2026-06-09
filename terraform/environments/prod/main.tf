module "notifications" {
  source = "../../root"

  environment             = "prod"
  aws_region              = "eu-central-1"
  notification_recipients = "Sebastian.Celejewski@wp.pl,Ag.Celejewska@wp.pl,FilipCelejewski@wp.pl,MajaCelejewska@wp.pl"
  smtp_host               = "smtp.wp.pl"
  smtp_port               = 587
  smtp_from               = "Sebastian.Celejewski@wp.pl"
  base_url                = "chocoop.pl"
}