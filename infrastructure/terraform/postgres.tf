# Azure PostgreSQL Flexible Server
resource "azurerm_postgresql_flexible_server" "pg" {
  name                   = local.pg_server_name
  resource_group_name    = azurerm_resource_group.rg.name
  location               = azurerm_resource_group.rg.location
  version                = "15"
  administrator_login    = var.pg_admin_username
  administrator_password = var.pg_admin_password
  zone                   = "1"
  storage_mb             = 32768             # 32 GB minimum for Flex Server
  sku_name               = "B_Standard_B1ms" # Cost-conscious Burstable tier

  # Note: A properly secured architecture would use Private DNS Zones and VNet injection.
  # For this Azure for Students cost-conscious scope without extra VNet components,
  # we rely on IP firewalling.
}

resource "azurerm_postgresql_flexible_server_database" "db" {
  name      = "flowforge_prod"
  server_id = azurerm_postgresql_flexible_server.pg.id
  collation = "en_US.utf8"
  charset   = "utf8"
}

# Allow Azure services to reach the server
# SECURITY TRADEOFF: In Azure, 0.0.0.0 specifically means "Allow public access from any Azure service
# within Azure to this server". It does NOT strictly isolate access to only our Container Apps;
# other Azure tenants can technically attempt connections.
# For this cost-conscious Azure for Students deployment, we avoid the heavy cost of a Virtual Network (VNet)
# and Private DNS Zones. We rely entirely on strong passwords and mandatory SSL.
resource "azurerm_postgresql_flexible_server_firewall_rule" "allow_azure" {
  name             = "AllowAllAzureServicesAndResourcesWithinAzureIps"
  server_id        = azurerm_postgresql_flexible_server.pg.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}
