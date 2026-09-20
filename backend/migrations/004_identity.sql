ALTER TABLE organizations 
ADD COLUMN name TEXT NOT NULL DEFAULT 'Default Organization',
ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE organization_members (
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('Admin', 'Manager', 'Member', 'Viewer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (organization_id, user_id)
);

INSERT INTO organization_members (organization_id, user_id, role)
SELECT organization_id, id, role FROM users;

ALTER TABLE users 
DROP COLUMN IF EXISTS organization_id, 
DROP COLUMN IF EXISTS role;
