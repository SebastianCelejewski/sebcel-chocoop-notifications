output "preferences_api_url" {
  description = "Function URL of the preferences API Lambda — configure this in sebcel-chocoop-app"
  value       = module.notifications_service.preferences_api_url
}
