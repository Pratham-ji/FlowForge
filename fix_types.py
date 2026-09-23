import re

with open('frontend/src/types/api.ts', 'r') as f:
    c = f.read()

# Add OrganizationDTO and OrganizationMemberDTO to types/api.ts if not present
if 'OrganizationDTO' not in c:
    c += """
export interface OrganizationDTO {
  id: string;
  name: string;
}

export interface OrganizationMemberDTO {
  userId: string;
  role: string;
  email?: string;
}
"""
    with open('frontend/src/types/api.ts', 'w') as f:
        f.write(c)

with open('frontend/src/api/client.ts', 'r') as f:
    c = f.read()

# Remove OrganizationDTO and OrganizationMemberDTO from client.ts
c = re.sub(r'export interface OrganizationDTO \{.*?\n\}\n', '', c, flags=re.DOTALL)
c = re.sub(r'export interface OrganizationMemberDTO \{.*?\n\}\n', '', c, flags=re.DOTALL)

# Add them to import from types/api.ts
if 'OrganizationDTO' not in c:
    c = c.replace('  ExecuteTransitionRequest,\n} from \'../types/api\';', '  ExecuteTransitionRequest,\n  OrganizationDTO,\n  OrganizationMemberDTO,\n} from \'../types/api\';')

with open('frontend/src/api/client.ts', 'w') as f:
    f.write(c)
