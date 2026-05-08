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