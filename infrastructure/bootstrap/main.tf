terraform {
  required_version = ">= 1.5.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.100.0"
    }
  }
}

provider "azurerm" {
  features {}
}

variable "location" {
  type    = string
  default = "eastasia"
}

variable "prefix" {
  type    = string
  default = "flowforge"
}

# The Resource Group for Terraform State
resource "azurerm_resource_group" "tfstate" {
  name     = "rg-${var.prefix}-tfstate"
  location = var.location
}

# The Storage Account for Terraform State
# Name must be globally unique and alphanumeric
resource "azurerm_storage_account" "tfstate" {
  name                     = "st${var.prefix}tfstate2026"
  resource_group_name      = azurerm_resource_group.tfstate.name
  location                 = azurerm_resource_group.tfstate.location
  account_tier             = "Standard"
  account_replication_type = "LRS" # Cost-conscious
  min_tls_version          = "TLS1_2"

  # Prevent accidental public access
  allow_nested_items_to_be_public = false
}

# The Storage Container for the state file
resource "azurerm_storage_container" "tfstate" {
  name                  = "tfstate"
  storage_account_name  = azurerm_storage_account.tfstate.name
  container_access_type = "private"
}

output "resource_group_name" {
  value = azurerm_resource_group.tfstate.name
}

output "storage_account_name" {
  value = azurerm_storage_account.tfstate.name
}

output "container_name" {
  value = azurerm_storage_container.tfstate.name
}
