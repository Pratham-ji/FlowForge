# User Assigned Identity for Container Apps to pull from ACR
resource "azurerm_user_assigned_identity" "aca_identity" {
  name                = "id-aca-${var.environment}"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
}

# Role Assignment to allow ACA Identity to pull from ACR
resource "azurerm_role_assignment" "aca_acr_pull" {
  scope                = azurerm_container_registry.acr.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_user_assigned_identity.aca_identity.principal_id
}

# Backend Container App
resource "azurerm_container_app" "backend" {
  name                         = "ca-backend-${var.environment}"
  container_app_environment_id = azurerm_container_app_environment.env.id
  resource_group_name          = azurerm_resource_group.rg.name
  revision_mode                = "Single"

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.aca_identity.id]
  }

  template {
    min_replicas = 0
    max_replicas = 1 # Cost-conscious

    container {
      name   = "backend"
      image  = var.backend_image
      cpu    = 0.25
      memory = "0.5Gi"

      env {
        name  = "ENV"
        value = "production"
      }
      env {
        name  = "PORT"
        value = "8080"
      }
      env {
        name  = "CORS_ALLOWED_ORIGIN"
        value = var.netlify_frontend_url
      }
      env {
        name        = "DATABASE_URL"
        secret_name = "database-url"
      }
      env {
        name        = "JWT_SECRET"
        secret_name = "jwt-secret"
      }

      liveness_probe {
        transport = "HTTP"
        port      = 8080
        path      = "/api/v1/health"
      }
      readiness_probe {
        transport = "HTTP"
        port      = 8080
        path      = "/api/v1/ready"
      }
    }
  }

  ingress {
    allow_insecure_connections = false
    external_enabled           = true
    target_port                = 8080
    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  secret {
    name  = "database-url"
    value = "host=${azurerm_postgresql_flexible_server.pg.fqdn} dbname=${azurerm_postgresql_flexible_server_database.db.name} user=${var.pg_admin_username} password=${var.pg_admin_password} port=5432 sslmode=require"
  }

  secret {
    name  = "jwt-secret"
    value = var.jwt_secret
  }

  registry {
    server   = azurerm_container_registry.acr.login_server
    identity = azurerm_user_assigned_identity.aca_identity.id
  }
}
