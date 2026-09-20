output "acr_login_server" {
  value       = azurerm_container_registry.acr.login_server
  description = "The login server for the Azure Container Registry"
}

output "backend_url" {
  value       = "https://${azurerm_container_app.backend.ingress[0].fqdn}"
  description = "The public URL of the Backend Container App"
}

output "frontend_url" {
  value       = "https://${azurerm_container_app.frontend.ingress[0].fqdn}"
  description = "The public URL of the Frontend Container App"
}

output "pg_server_fqdn" {
  value       = azurerm_postgresql_flexible_server.pg.fqdn
  description = "The FQDN of the PostgreSQL server (for running migrations)"
}
