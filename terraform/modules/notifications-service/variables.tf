variable "application" {
  type = string
}

variable "component" {
  type = string
}

variable "environment" {
  type = string
}

variable "common_tags" {
  type = map(string)
}

variable "event_bus_name" {
  type = string
}

variable "smtp_host" {
  type        = string
  description = "SMTP server hostname"
}

variable "smtp_port" {
  type        = number
  description = "SMTP server port (587 for STARTTLS, 465 for SSL)"
  default     = 587
}

variable "smtp_from" {
  type        = string
  description = "Sender email address (From header)"
}

variable "base_url" {
  type        = string
  description = "Frontend base URL used to build deep links in notification emails"
}

variable "notifications_enabled" {
  type        = bool
  description = "Global toggle — set to false to disable all email notifications"
  default     = true
}

variable "cognito_user_pool_id" {
  type        = string
  description = "Cognito User Pool ID — used by the preferences API to verify ID tokens"
}

variable "cognito_client_id" {
  type        = string
  description = "Cognito App Client ID — used by the preferences API to verify ID tokens"
}

