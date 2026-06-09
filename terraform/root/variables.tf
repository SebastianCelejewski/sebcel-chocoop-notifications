variable "environment" {
  type = string
}

variable "aws_region" {
  type = string
}

variable "notification_recipients" {
  type        = string
  description = "Comma-separated list of email addresses to notify"
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