variable "location" {
  description = "The Azure region to deploy resources into"
  type        = string
  default     = "eastus"
}

variable "environment" {
  description = "Environment name (e.g., dev, prod)"
  type        = string
  default     = "dev"
}

variable "app_name" {
  description = "Base application name"
  type        = string
  default     = "flowforge"
}

variable "pg_admin_username" {
  description = "PostgreSQL administrator username"
  type        = string
  sensitive   = true
}

variable "pg_admin_password" {
  description = "PostgreSQL administrator password"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT Secret for backend authentication"
  type        = string
  sensitive   = true
}

variable "backend_image" {
  description = "Docker image for the backend. Use a dummy image initially to bootstrap ACA."
  type        = string
  default     = "mcr.microsoft.com/azuredocs/containerapps-helloworld:latest"
}

variable "netlify_frontend_url" {
  description = "The exact HTTPS URL of the deployed Netlify frontend (for CORS)"
  type        = string
}
