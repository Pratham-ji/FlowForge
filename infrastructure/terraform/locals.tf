locals {
  # Naming conventions
  resource_group_name = "rg-${var.app_name}-${var.environment}"

  # ACR names must be globally unique and alphanumeric only
  acr_name = "cr${var.app_name}${var.environment}"

  # PostgreSQL Server name
  pg_server_name = "psql-${var.app_name}-${var.environment}"

  # Log Analytics Workspace
  log_workspace_name = "log-${var.app_name}-${var.environment}"

  # Container Apps Environment
  aca_env_name = "cae-${var.app_name}-${var.environment}"
}
