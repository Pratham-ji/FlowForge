terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.100.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "rg-flowforge-tfstate"
    storage_account_name = "stflowforgetfstate2026"
    container_name       = "tfstate"
    key                  = "flowforge.tfstate"
    use_azuread_auth     = true
  }
}
