# Azure Infrastructure Architecture

## Deployment Status
**CURRENT STATE:**
- Terraform infrastructure-as-code configuration exists.
- Terraform `plan` has been validated.
- Azure bootstrap remote state storage (Blob Container) exists and is authenticated via AD.
- Main application infrastructure has NOT yet been applied.
- Application images have NOT yet been deployed to Container Apps or ACR.

**INTENDED ARCHITECTURE:**
This document describes the intended Azure architecture for deploying FlowForge, which features a public HTTPS frontend, a public Azure Container Apps backend, PostgreSQL Flexible Server, Azure Container Registry, Log Analytics, and managed identities. It is not currently live.


## Architecture Diagram

```text
       [Internet]
           │
           ▼
[Azure Container Apps Environment]
 ├── FlowForge Frontend (ca-frontend-dev)
 │      - Image from ACR
 │      - Nginx (Unprivileged, port 8080)
 │      - VITE_API_BASE_URL mapped to backend URL at build time
 │      - System-Assigned Managed Identity for ACR Pull
 │
 └── FlowForge Backend (ca-backend-dev)
        - Image from ACR
        - Haskell/Servant (port 8080)
        - CORS_ALLOWED_ORIGIN mapped to frontend URL
        - System-Assigned Managed Identity for ACR Pull
        - Connects to Postgres
           │
           ▼
 [Azure PostgreSQL Flexible Server] (psql-flowforge-dev)
        - Basic B_Standard_B1ms SKU
        - SSL Required
        - IP Firewall locked to 0.0.0.0 (All Azure Services broadly)

[Azure Container Registry] (crflowforgedev)
  - Basic SKU
  - Hosts `flowforge/backend` and `flowforge/frontend`
  - Admin Credentials disabled (uses RBAC AcrPull)

[Azure Log Analytics Workspace]
  - Collects stdout/stderr logs from Container Apps
```

## Architectural Decisions

1.  **Azure Container Apps (ACA):** Chosen over AKS (Azure Kubernetes Service) or Azure App Service. ACA provides a serverless container environment with native scale-to-zero capabilities, which is highly cost-effective for a portfolio project.
2.  **Azure Container Registry (ACR):** A Basic SKU ACR is provisioned. **Security Note:** `admin_enabled` is explicitly `false` to avoid storing static registry credentials in Terraform state. The Container Apps use System-Assigned Managed Identities with the `AcrPull` Role Assignment to securely download images.
3.  **Azure PostgreSQL Flexible Server (Public Networking Tradeoff):**
    *   To strictly minimize costs on an Azure for Students subscription, we bypass deploying a Virtual Network (VNet) and Private DNS Zones.
    *   Instead, the server is exposed publicly but guarded by a firewall rule setting start and end IPs to `0.0.0.0`.
    *   *Security Tradeoff:* `0.0.0.0` means "Allow public access from any Azure service within Azure to this server", which technically permits connection attempts from *other* Azure tenants, not strictly just our Container Apps. Therefore, we rely on a strong administrator password and mandatory SSL mode to secure the connection.
4.  **Health & Readiness Probes:** The backend Container App uses `probe { type = "Liveness" }` for `/api/v1/health` and `probe { type = "Readiness" }` for `/api/v1/ready`.

## Secrets and Terraform State Strategy

Terraform state fundamentally stores resource attributes in plain text, meaning `sensitive = true` prevents accidental UI output but **does not encrypt the local state file**.

To prevent `pg_admin_password` and `jwt_secret` from leaking via Git or local developer machines, the project employs a **Bootstrap Phase**:
1.  Navigate to `infrastructure/bootstrap/`.
2.  Run `terraform apply` to provision an Azure Storage Account and Container.
3.  Navigate to `infrastructure/terraform/` and uncomment the `backend "azurerm"` block in `versions.tf`.
4.  Run `terraform init` to lock the state into remote, encrypted Azure Storage.

Secrets are securely injected into ACA Environment Variables natively and are never exposed as Terraform outputs.

## Deployment Workflow (The Frontend URL Dependency)

Because `VITE_API_BASE_URL` is evaluated during the frontend Docker build (and baked into the JavaScript bundle), we cannot inject the backend URL into the frontend container purely at runtime. The deployment sequence must be:

1.  **Stage 1 - Terraform Infrastructure:**
    *   Provision the infrastructure using a placeholder "hello world" image for both apps.
    *   Terraform evaluates the ACA default domain and injects the deterministic frontend URL into the backend's `CORS_ALLOWED_ORIGIN`.
    *   Terraform outputs `backend_url` and `frontend_url`.
2.  **Stage 2 - Database Migration:** Run the SQL migrations against the new Postgres server (e.g., using `psql` locally).
3.  **Stage 3 - Build & Deploy:**
    *   Build the Haskell backend image and push it to ACR.
    *   Build the React frontend image *passing the Terraform `backend_url` output as the `VITE_API_BASE_URL` build argument*.
    *   Push to ACR.
    *   Update the ACA container images via Azure CLI.

## Cost Considerations
To protect the Azure for Students credit:
*   ACA `min_replicas` is set to `0` to allow scaling to zero when idle.
*   ACR uses the `Basic` SKU.
*   PostgreSQL uses the Burstable `B1ms` SKU (the cheapest available tier).
*   Log Analytics retention is capped at 30 days.
