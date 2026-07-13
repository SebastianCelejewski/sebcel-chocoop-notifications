module "notifications" {
  source = "../../root"

  environment             = "uat"
  aws_region              = "eu-central-1"
  smtp_host               = "smtp.wp.pl"
  smtp_port               = 587
  smtp_from               = "Sebastian.Celejewski@wp.pl"
  base_url                = "uat.drmf9v4p6jnv3.amplifyapp.com"
  notifications_enabled   = false
  cognito_user_pool_id    = "eu-central-1_nWNpRdC79"
  cognito_client_id       = "3co4e7bpjkjo17vdld5f4v7ki3"
}