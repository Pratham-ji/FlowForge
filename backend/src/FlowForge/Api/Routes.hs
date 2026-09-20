{-# LANGUAGE DataKinds #-}
{-# LANGUAGE TypeOperators #-}

module FlowForge.Api.Routes
  ( FlowForgeAPI
  , RootAPI
  , rootAPI
  , flowForgeAPI
  , WorkflowsApi
  , InstancesApi
  , OrganizationsApi
  ) where

import Servant.API
import Data.OpenApi (OpenApi)
import Data.Proxy (Proxy(..))
import Servant.Auth.Server
import Data.UUID (UUID)
import FlowForge.Api.Types
import FlowForge.Api.Requests
import FlowForge.Api.Responses

type WorkflowsApi =
       "workflows" :> Get '[JSON] [WorkflowDTO]
  :<|> "workflows" :> ReqBody '[JSON] CreateWorkflowRequest :> PostCreated '[JSON] WorkflowDTO
  :<|> "workflows" :> Capture "workflowId" UUID :> Get '[JSON] WorkflowDTO
  :<|> "workflows" :> Capture "workflowId" UUID :> "activate" :> Post '[JSON] WorkflowDTO
  :<|> "workflows" :> Capture "workflowId" UUID :> "archive" :> Post '[JSON] WorkflowDTO
  :<|> "workflows" :> Capture "workflowId" UUID :> "instances" :> PostCreated '[JSON] WorkflowInstanceDTO
  :<|> "workflows" :> Capture "workflowId" UUID :> "instances" :> Get '[JSON] [WorkflowInstanceDTO]

type InstancesApi =
       "instances" :> Capture "instanceId" UUID :> Get '[JSON] WorkflowInstanceDTO
  :<|> "instances" :> Capture "instanceId" UUID :> "transition" :> ReqBody '[JSON] ExecuteTransitionRequest :> Post '[JSON] WorkflowInstanceDTO
  :<|> "instances" :> Capture "instanceId" UUID :> "audit" :> Get '[JSON] [AuditEventDTO]



-- We split the API into Public and Protected. The `/me` actually needs Auth, so it goes to Protected.
-- Wait, if Login is in both, that's duplicative or we can structure it so Auth is checked optionally, or just strict.
-- A cleaner way:
type OrganizationsApi = "organizations" :>
  (    Get '[JSON] [OrganizationDTO]
  :<|> ReqBody '[JSON] CreateOrganizationRequest :> Post '[JSON] OrganizationDTO
  :<|> Capture "orgId" UUID :> Get '[JSON] OrganizationDTO
  :<|> Capture "orgId" UUID :> "members" :>
       (    Get '[JSON] [OrganizationMemberDTO]
       :<|> ReqBody '[JSON] AddMemberRequest :> Post '[JSON] OrganizationMemberDTO
       :<|> Capture "userId" UUID :> ReqBody '[JSON] ChangeRoleRequest :> Put '[JSON] OrganizationMemberDTO
       :<|> Capture "userId" UUID :> Delete '[JSON] NoContent
       )
  )

type FlowForgeAPI = "api" :> "v1" :>
  (    "health" :> Get '[JSON] String
  :<|> "ready"  :> Get '[JSON] String
  :<|> "auth" :> "login" :> ReqBody '[JSON] LoginRequest :> Post '[JSON] AuthResponse
  :<|> Auth '[JWT] AuthenticatedUser :> "me" :> Get '[JSON] UserDTO
  :<|> Auth '[JWT] AuthenticatedUser :> Header "X-Organization-Id" UUID :> WorkflowsApi
  :<|> Auth '[JWT] AuthenticatedUser :> Header "X-Organization-Id" UUID :> InstancesApi
  :<|> Auth '[JWT] AuthenticatedUser :> OrganizationsApi
    )

type RootAPI = FlowForgeAPI :<|> "api" :> "v1" :> "openapi.json" :> Get '[JSON] OpenApi

rootAPI :: Proxy RootAPI
rootAPI = Proxy

flowForgeAPI :: Proxy FlowForgeAPI
flowForgeAPI = Proxy
