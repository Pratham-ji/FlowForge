with open('frontend/src/types/api.ts', 'r') as f:
    c = f.read()
c = c.replace('export interface OrganizationMemberDTO {\n  userId: string;\n  role: string;\n}', 'export interface OrganizationMemberDTO {\n  userId: string;\n  role: string;\n  email?: string;\n}')
with open('frontend/src/types/api.ts', 'w') as f:
    f.write(c)
with open('frontend/src/api/client.ts', 'r') as f:
    c = f.read()
c = c.replace('export interface OrganizationMemberDTO {\n  userId: string;\n  role: string;\n}', 'export interface OrganizationMemberDTO {\n  userId: string;\n  role: string;\n  email?: string;\n}')
with open('frontend/src/api/client.ts', 'w') as f:
    f.write(c)

with open('frontend/src/features/workspaces/WorkspaceSettings.tsx', 'r') as f:
    c = f.read()

c = c.replace('<p className="text-sm font-medium text-gray-900">{member.userId}</p>', '<p className="text-sm font-medium text-gray-900">{member.email || "Unknown User"}</p>')
with open('frontend/src/features/workspaces/WorkspaceSettings.tsx', 'w') as f:
    f.write(c)
