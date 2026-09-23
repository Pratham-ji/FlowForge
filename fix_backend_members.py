import re

with open('backend/src/FlowForge/Domain/Types.hs', 'r') as f:
    c = f.read()
c = c.replace('data OrganizationMember = OrganizationMember { omOrgId :: OrganizationId, omUserId :: UserId, omRole :: Role } deriving (Eq, Show)', 'data OrganizationMember = OrganizationMember { omOrgId :: OrganizationId, omUserId :: UserId, omRole :: Role, omEmail :: Maybe Text } deriving (Eq, Show)')
with open('backend/src/FlowForge/Domain/Types.hs', 'w') as f:
    f.write(c)

with open('backend/src/FlowForge/Infrastructure/Repositories/User.hs', 'r') as f:
    c = f.read()

# Update listOrganizationMembers query
q1 = '"SELECT user_id, role FROM organization_members WHERE organization_id = ?"'
q2 = '"SELECT m.user_id, m.role, u.email FROM organization_members m JOIN users u ON m.user_id = u.id WHERE m.organization_id = ?"'
c = c.replace(q1, q2)

parse1 = r'Right parsed -> return \$ Right \[ OrganizationMember \(OrganizationId oid\) \(UserId uid\) \(parseRole r\) \| \(uid, r\) <- parsed \]'
parse2 = r'Right parsed -> return $ Right [ OrganizationMember (OrganizationId oid) (UserId uid) (parseRole r) (Just e) | (uid, r, e) <- parsed ]'
c = re.sub(parse1, parse2, c)

# update addOrganizationMember
parse3 = r'Right \[\] -> return \$ Right \$ OrganizationMember oid \(UserId uid\) role'
parse4 = r'Right [] -> return $ Right $ OrganizationMember oid (UserId uid) role Nothing'
c = re.sub(parse3, parse4, c)

# update updateOrganizationMemberRole
parse5 = r'Right \[\] -> return \$ Right \$ OrganizationMember oid \(UserId uid\) role'
c = re.sub(parse5, parse4, c)

with open('backend/src/FlowForge/Infrastructure/Repositories/User.hs', 'w') as f:
    f.write(c)

with open('backend/src/FlowForge/Api/Responses.hs', 'r') as f:
    c = f.read()
c = c.replace('  { dtoUserId :: UUID\n  , dtoRole :: RoleDTO\n  } deriving (Show, Generic)', '  { dtoUserId :: UUID\n  , dtoRole :: RoleDTO\n  , dtoEmail :: Maybe Text\n  } deriving (Show, Generic)')
c = c.replace('    renameId "dtoUserId" = "userId"\n    renameId "dtoRole" = "role"', '    renameId "dtoUserId" = "userId"\n    renameId "dtoRole" = "role"\n    renameId "dtoEmail" = "email"')
with open('backend/src/FlowForge/Api/Responses.hs', 'w') as f:
    f.write(c)

with open('backend/src/FlowForge/Api/Handlers.hs', 'r') as f:
    c = f.read()
c = c.replace('return $ map (\\m -> OrganizationMemberDTO (let (UserId muid) = omUserId m in muid) (fromDomainRole (omRole m))) members', 'return $ map (\\m -> OrganizationMemberDTO (let (UserId muid) = omUserId m in muid) (fromDomainRole (omRole m)) (omEmail m)) members')
with open('backend/src/FlowForge/Api/Handlers.hs', 'w') as f:
    f.write(c)

