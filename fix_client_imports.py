import re

with open('frontend/src/api/client.ts', 'r') as f:
    c = f.read()

# Add to the import block
c = c.replace("  ExecuteTransitionRequest,\n} from '../types/api';", "  ExecuteTransitionRequest,\n  OrganizationDTO,\n  OrganizationMemberDTO,\n} from '../types/api';")

with open('frontend/src/api/client.ts', 'w') as f:
    f.write(c)

