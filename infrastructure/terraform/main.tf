resource "azurerm_resource_group" "rg" {
  name     = local.resource_group_name
  location = var.location
}

# Container Registry for Docker images
resource "azurerm_container_registry" "acr" {
  name                = local.acr_name
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  sku                 = "Basic" # Cost-conscious for Azure for Students
  admin_enabled       = false   # Use Managed Identity via RBAC instead of admin credentials
}

# Log Analytics Workspace for Container Apps
resource "azurerm_log_analytics_workspace" "log" {
  name                = local.log_workspace_name
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  sku                 = "PerGB2018"
  retention_in_days   = 30 # Minimize cost
}

# Azure Container Apps Environment
resource "azurerm_container_app_environment" "env" {
  name                       = local.aca_env_name
  location                   = azurerm_resource_group.rg.location
  resource_group_name        = azurerm_resource_group.rg.name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.log.id
}
