import re

with open('backend/src/FlowForge/Api/Handlers.hs', 'r') as f:
    c = f.read()

c = re.sub(r'return \$ OrganizationMemberDTO \(let \(UserId muid\) = omUserId m in muid\) \(fromDomainRole \(omRole m\)\)', r'return $ OrganizationMemberDTO (let (UserId muid) = omUserId m in muid) (fromDomainRole (omRole m)) (omEmail m)', c)

with open('backend/src/FlowForge/Api/Handlers.hs', 'w') as f:
    f.write(c)

