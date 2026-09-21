# FlowForge Production Runbook

## 1. Local Setup
- **Backend:** `cd backend && cabal build && cabal test`
- **Frontend:** `cd frontend && npm install && npm run build`
- **Local DB:** Start a PostgreSQL container. Connection string defaults to `host=localhost dbname=flowforge_test user=postgres password=postgres port=5432` if `ENV=Development`.

## 2. Environment Variables
### Backend (Azure Container Apps)
- `ENV`: Set to `production`
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secure 256-bit+ random string
- `CORS_ALLOWED_ORIGIN`: Exact Netlify URL (e.g. `https://flowforgein.netlify.app`)

### Frontend (Netlify)
- `VITE_API_BASE_URL`: Azure Container App URL (e.g. `https://flowforge-api.azurecontainer.io/api/v1`)

## 3. Database Migration Procedure
Migrations are strictly ordered SQL files in `backend/migrations`.
- **Initialization:** Run sequentially `001` through `004` against the target database before starting the backend container.
- Do not apply migrations silently; back up data before running new scripts.

## 4. Docker Build
- Target: `backend/Dockerfile`
- Build command: `docker build -t flowforge-api ./backend`
- Push to Azure Container Registry before deploying to Container Apps.

## 5. Azure Deployment Order
1. **Terraform Apply:** Applies Resource Group, ACR, Postgres Flexible Server, and Container Apps Environment.
2. **Database Migrations:** Run SQL migrations on the newly created Postgres instance.
3. **Docker Push:** Push `flowforge-api` to ACR.
4. **App Deployment:** Update Azure Container App to use the latest image tag.

## 6. Netlify Configuration
- **Build command:** `npm run build` (runs `tsc -b && vite build`)
- **Publish directory:** `dist`
- **Routing:** Automatically handled by `public/_redirects` (`/* /index.html 200`)
- **Required Env Var:** `VITE_API_BASE_URL` pointing to Azure Container Apps.

## 7. Health Checks
- **Health (Liveness):** `GET /api/v1/health` (process is alive)
- **Readiness:** `GET /api/v1/ready` (checks DB connection pool)

## 8. Logs
- **Backend:** Azure Log Analytics Workspace (Standard output). Ensure structured logs are enabled.
- **Frontend:** Netlify build logs and browser console.

## 9. Rollback Basics
- **Frontend:** Instant rollback via Netlify dashboard.
- **Backend:** Rollback Container App to a previous revision/image tag.
- **Database:** Only roll back if data is corrupt; otherwise avoid downward migrations in a live SaaS. Use Point-in-Time Restore via Azure Postgres.
