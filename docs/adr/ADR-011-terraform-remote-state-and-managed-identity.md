# ADR 011: Terraform Remote State and Managed Identity

## Status
Accepted

## Context
Infrastructure as Code (IaC) requires secure state management and robust role propagation to allow Container Apps to pull images from the Container Registry (ACR).

## Decision
- Use **Azure Blob Storage** for remote Terraform state, authenticated via Azure AD identity (`use_azuread_auth = true`) instead of vulnerable storage access keys.
- Provision a completely independent **User-Assigned Managed Identity** via Terraform to grant the Container Apps `AcrPull` access to the ACR.

## Consequences
Managed identity avoids registry credentials for ACR image pulls. Other sensitive deployment values may still be represented through Terraform variables/configuration and therefore require appropriate state protection. The User-Assigned Identity elegantly solves the circular dependency problem (where a Container App needs to pull an image to start, but its system identity role assignment hasn't propagated yet) by isolating the identity lifecycle.

## Alternatives Considered
System-Assigned Identities for Container Apps. Rejected because they cause a bootstrap chicken-and-egg problem during the initial Terraform deployment.
