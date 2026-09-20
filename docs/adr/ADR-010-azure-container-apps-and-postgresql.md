# ADR 010: Azure Container Apps and PostgreSQL (Intended)

## Status
Accepted (Configured, Not Applied)

## Context
We intend to deploy FlowForge to Azure, minimizing operational overhead and baseline costs (Azure for Students compatibility) while maintaining security.

## Decision
**CURRENT STATE:**
- Terraform configuration exists.
- Terraform plan has been validated.
- Azure bootstrap state storage exists.
- Main application infrastructure has not yet been applied.
- Application images have not yet been deployed.

**INTENDED ARCHITECTURE:**
The *intended* architecture uses:
- **Azure Container Apps (ACA)** for serverless container hosting, scaling to zero.
- **Azure PostgreSQL Flexible Server (Burstable)** for persistent storage.
- **Azure Log Analytics** for log aggregation.
We accept a cost-conscious security tradeoff: avoiding Virtual Network (VNet) injection in favor of PostgreSQL IP firewall rules (`0.0.0.0` allowing Azure services), relying on mandatory SSL and strong credentials.

## Consequences
Near-zero idle compute costs and automated TLS termination via ACA ingress. Accepting the database firewall tradeoff keeps the infrastructure budget within student limits.

## Alternatives Considered
Azure Kubernetes Service (AKS). Rejected due to high baseline cluster costs and severe operational management overhead which distracts from the core application demonstration.
