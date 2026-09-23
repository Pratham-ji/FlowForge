with open('frontend/src/features/workspaces/WorkspaceSettings.tsx', 'r') as f:
    c = f.read()

# Add import if missing
if 'OrganizationMemberDTO' not in c:
    c = c.replace("import * as api from '../../api/client';", "import * as api from '../../api/client';\nimport type { OrganizationMemberDTO } from '../../types/api';")

c = c.replace('api.OrganizationMemberDTO', 'OrganizationMemberDTO')

with open('frontend/src/features/workspaces/WorkspaceSettings.tsx', 'w') as f:
    f.write(c)

