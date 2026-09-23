import re

with open('frontend/src/api/client.ts', 'r') as f:
    c = f.read()

# Hardening API client
def replace_func(match):
    func_decl = match.group(1)
    org_param = match.group(2)
    body = match.group(3)
    if 'orgId' in org_param:
        return f"{func_decl} {{\n  if (!orgId) throw new AppError('NO_WORKSPACE', 'Workspace context is required.', 400);\n{body}"
    return match.group(0)

# Replace all functions that take orgId to check it first
c = re.sub(r'(export async function \w+\(.*?(orgId: string).*?\)(?: *: *Promise<[^>]+>)? *){\n(.*?\n})', replace_func, c, flags=re.DOTALL)

with open('frontend/src/api/client.ts', 'w') as f:
    f.write(c)

