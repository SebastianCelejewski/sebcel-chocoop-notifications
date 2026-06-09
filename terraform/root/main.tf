data "aws_cloudwatch_event_bus" "shared" {
  name = "sebcel-chocoop-infra-bus-${var.environment}"
}

module "notifications_service" {
  source = "../modules/notifications-service"
  application             = local.application
  component               = "notifications"
  environment             = var.environment
  common_tags             = local.common_tags
  event_bus_name          = data.aws_cloudwatch_event_bus.shared.name
  notification_recipients = var.notification_recipients
  smtp_host               = var.smtp_host
  smtp_port               = var.smtp_port
  smtp_from               = var.smtp_from
  base_url                = var.base_url
}