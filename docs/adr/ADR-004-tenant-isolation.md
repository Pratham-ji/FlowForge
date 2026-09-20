# ADR 004: Tenant Isolation

## Status
Accepted

## Context
FlowForge is a multi-tenant B2B system. Users belong to an Organization and must only be able to view, create, or transition workflows that belong to their specific Organization.

## Decision
Organization ID is securely embedded as a claim inside the signed JWT. The Application layer extracts this `OrganizationId` from the verified token and explicitly passes it into every database repository call. We explicitly do *not* trust client-supplied organization IDs in request payloads or URL parameters.

## Consequences
Tenant isolation is enforced strongly at the lowest repository query level (e.g., `WHERE org_id = ?`). A compromised client or API request manipulation is prevented from accessing other tenants' data within the application scope.

## Alternatives Considered
Separate database instances or schemas per tenant. Rejected due to the high operational cost and maintenance overhead for a portfolio project. Row-level multi-tenancy is standard and sufficient here.
