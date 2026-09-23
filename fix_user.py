with open('backend/src/FlowForge/Infrastructure/Repositories/User.hs', 'r') as f:
    c = f.read()

c = c.replace(
    'let parsed\' = [ (uid, parseRole roleStr) | (uid, roleStr) <- parsed ]\n          if any (\(_, r) -> r == Nothing) parsed\'\n            then return $ Left $ PersistenceFailure "Invalid role found"\n            else return $ Right [ OrganizationMember (OrganizationId oid) (UserId uid) (let Just ro = r in ro) | (uid, r) <- parsed\' ]',
    'let parsed\' = [ (uid, parseRole roleStr, email) | (uid, roleStr, email) <- parsed ]\n          if any (\(_, r, _) -> r == Nothing) parsed\'\n            then return $ Left $ PersistenceFailure "Invalid role found"\n            else return $ Right [ OrganizationMember (OrganizationId oid) (UserId uid) (let Just ro = r in ro) (Just email) | (uid, r, email) <- parsed\' ]'
)

c = c.replace('Right $ OrganizationMember (OrganizationId oid) (UserId uid) role\n', 'Right $ OrganizationMember (OrganizationId oid) (UserId uid) role Nothing\n')

with open('backend/src/FlowForge/Infrastructure/Repositories/User.hs', 'w') as f:
    f.write(c)

