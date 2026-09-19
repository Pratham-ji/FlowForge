CREATE TABLE organizations (
    id UUID PRIMARY KEY
);

CREATE TABLE users (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    role TEXT NOT NULL CHECK (role IN ('Admin', 'Manager', 'Member', 'Viewer'))
);

CREATE TABLE workflows (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    name TEXT NOT NULL,
    lifecycle TEXT NOT NULL CHECK (lifecycle IN ('Draft', 'Active', 'Archived')),
    initial_state_id UUID NOT NULL, -- Deferred FK or circular. We will add FK after workflow_states.
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE workflow_states (
    id UUID PRIMARY KEY,
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_terminal BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (workflow_id, name)
);

ALTER TABLE workflows ADD CONSTRAINT fk_workflows_initial_state 
    FOREIGN KEY (initial_state_id) REFERENCES workflow_states(id) INITIALLY DEFERRED;

CREATE TABLE workflow_transitions (
    id UUID PRIMARY KEY,
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    source_state_id UUID NOT NULL REFERENCES workflow_states(id) ON DELETE CASCADE,
    target_state_id UUID NOT NULL REFERENCES workflow_states(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    required_permission TEXT NOT NULL CHECK (required_permission IN (
        'ManageOrganization', 'CreateWorkflow', 'ReadWorkflow', 'UpdateWorkflow', 
        'DeleteWorkflow', 'CreateInstance', 'ReadInstance', 'TransitionInstance', 'ReadAudit'
    )),
    UNIQUE (source_state_id, action) -- Business logic duplication invariant
);

CREATE TABLE workflow_instances (
    id UUID PRIMARY KEY,
    workflow_id UUID NOT NULL REFERENCES workflows(id),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    current_state_id UUID NOT NULL REFERENCES workflow_states(id),
    created_by UUID NOT NULL REFERENCES users(id),
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    workflow_instance_id UUID NOT NULL REFERENCES workflow_instances(id),
    actor_id UUID NOT NULL REFERENCES users(id),
    previous_state_id UUID NOT NULL REFERENCES workflow_states(id),
    action TEXT NOT NULL,
    resulting_state_id UUID NOT NULL REFERENCES workflow_states(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
