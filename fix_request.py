with open('frontend/src/api/client.ts', 'r') as f:
    c = f.read()

target = """  // Do not add org context to auth or org routes
  if (org && !path.startsWith('/auth') && path !== '/me' && !path.startsWith('/organizations')) {
    headers['X-Organization-Id'] = org;
  }"""

replacement = """  const requiresOrg = !path.startsWith('/auth') && path !== '/me' && !path.startsWith('/organizations');
  if (requiresOrg) {
    if (!org) {
      throw new AppError('NO_WORKSPACE', 'Workspace context is required.', 400);
    }
    headers['X-Organization-Id'] = org;
  }"""

c = c.replace(target, replacement)

with open('frontend/src/api/client.ts', 'w') as f:
    f.write(c)

