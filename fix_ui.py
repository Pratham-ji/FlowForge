import os
import glob

replacements = {
    "currentOrg": "currentWorkspace",
    "setCurrentOrgId": "setCurrentWorkspaceId",
    "organizations": "workspaces",
    "OrganizationSettings": "WorkspaceSettings",
    "features/organizations/OrganizationSettings": "features/workspaces/WorkspaceSettings"
}

files = glob.glob('frontend/src/**/*.tsx', recursive=True) + glob.glob('frontend/src/**/*.ts', recursive=True)

for filepath in files:
    with open(filepath, 'r') as f:
        c = f.read()
    
    modified = c
    for old, new in replacements.items():
        modified = modified.replace(old, new)
        
    if modified != c:
        with open(filepath, 'w') as f:
            f.write(modified)
