-- 003_performance_indexes.sql
-- Fixes N+1 and sequential scan issues for heavily queried foreign keys.

-- 1. workflows.organization_id
-- Accelerates listWorkflows which uses `WHERE organization_id = ?`
CREATE INDEX IF NOT EXISTS idx_workflows_org_id ON workflows(organization_id);

-- 2. workflow_instances composite index
-- Accelerates listWorkflowInstances which uses `WHERE workflow_id = ? AND organization_id = ?`
CREATE INDEX IF NOT EXISTS idx_workflow_instances_wf_org ON workflow_instances(workflow_id, organization_id);

-- 3. audit_entries composite index
-- Accelerates getAuditEvents which uses `WHERE organization_id = ? AND workflow_instance_id = ? ORDER BY created_at ASC`
-- Since organization_id and workflow_instance_id are both checked, a composite index helps avoid sequential scans.
CREATE INDEX IF NOT EXISTS idx_audit_entries_org_inst ON audit_entries(organization_id, workflow_instance_id);

