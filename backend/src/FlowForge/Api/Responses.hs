{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE OverloadedStrings #-}

module FlowForge.Api.Responses
  ( AuthResponse(..)
  , UserDTO(..)
  , WorkflowDTO(..)
  , WorkflowInstanceDTO(..)
  , AuditEventDTO(..)
  , fromDomainWorkflow
  , fromDomainInstance
  , fromDomainAudit
  , customOptions
  ) where

import GHC.Generics
import Data.Aeson
import Data.OpenApi (ToSchema)
import Data.UUID (UUID)
import Data.Text (Text)

import FlowForge.Api.Types (RoleDTO)
import FlowForge.Domain.Types

customOptions :: Options
customOptions = defaultOptions { fieldLabelModifier = renameId }
  where
    renameId "respUserId" = "id"
    renameId "respOrgId" = "organizationId"
    renameId "respRole" = "role"
    renameId "respWfId" = "id"
    renameId "respWfOrgId" = "organizationId"
    renameId "respWfName" = "name"
    renameId "respWfLifecycle" = "lifecycle"
    renameId "respWfInitState" = "initialStateId"
    renameId "respInstId" = "id"
    renameId "respInstWfId" = "workflowId"
    renameId "respInstState" = "currentStateId"
    renameId "respInstCreatedBy" = "createdBy"
    renameId "respInstVersion" = "version"
    renameId other = other

data UserDTO = UserDTO
  { respUserId :: UUID
  , respOrgId :: UUID
  , respRole :: RoleDTO
  } deriving (Show, Generic)
instance ToJSON UserDTO where toJSON = genericToJSON customOptions
instance FromJSON UserDTO where parseJSON = genericParseJSON customOptions
instance ToSchema UserDTO

data AuthResponse = AuthResponse
  { token :: Text
  , user :: UserDTO
  } deriving (Show, Generic)
instance ToJSON AuthResponse
instance FromJSON AuthResponse
instance ToSchema AuthResponse

data WorkflowDTO = WorkflowDTO
  { respWfId :: UUID
  , respWfOrgId :: UUID
  , respWfName :: Text
  , respWfLifecycle :: Text
  , respWfInitState :: UUID
  } deriving (Show, Generic)
instance ToJSON WorkflowDTO where toJSON = genericToJSON customOptions
instance FromJSON WorkflowDTO where parseJSON = genericParseJSON customOptions
instance ToSchema WorkflowDTO

fromDomainWorkflow :: Workflow -> WorkflowDTO
fromDomainWorkflow w = WorkflowDTO
  { respWfId = unWorkflowId (wId w)
  , respWfOrgId = unOrganizationId (wOrgId w)
  , respWfName = wName w
  , respWfLifecycle = case wLifecycle w of
      Draft -> "Draft"
      Active -> "Active"
      Archived -> "Archived"
  , respWfInitState = unWorkflowStateId (wInitialStateId w)
  }

data WorkflowInstanceDTO = WorkflowInstanceDTO
  { respInstId :: UUID
  , respInstWfId :: UUID
  , respInstState :: UUID
  , respInstCreatedBy :: UUID
  , respInstVersion :: Int
  } deriving (Show, Generic)
instance ToJSON WorkflowInstanceDTO where toJSON = genericToJSON customOptions
instance FromJSON WorkflowInstanceDTO where parseJSON = genericParseJSON customOptions
instance ToSchema WorkflowInstanceDTO

fromDomainInstance :: WorkflowInstance -> Int -> WorkflowInstanceDTO
fromDomainInstance inst v = WorkflowInstanceDTO
  { respInstId = unWorkflowInstanceId (wiId inst)
  , respInstWfId = unWorkflowId (wiWorkflowId inst)
  , respInstState = unWorkflowStateId (wiCurrentStateId inst)
  , respInstCreatedBy = unUserId (wiCreatedBy inst)
  , respInstVersion = v
  }

data AuditEventDTO = AuditEventDTO
  { actorId :: UUID
  , previousStateId :: UUID
  , action :: Text
  , resultingStateId :: UUID
  } deriving (Show, Generic)
instance ToJSON AuditEventDTO
instance FromJSON AuditEventDTO
instance ToSchema AuditEventDTO

fromDomainAudit :: AuditEvent -> AuditEventDTO
fromDomainAudit a = AuditEventDTO
  { actorId = unUserId (aeActorId a)
  , previousStateId = unWorkflowStateId (aePreviousStateId a)
  , action = unWorkflowAction (aeAction a)
  , resultingStateId = unWorkflowStateId (aeResultingStateId a)
  }

unWorkflowId :: WorkflowId -> UUID
unWorkflowId (WorkflowId i) = i

unOrganizationId :: OrganizationId -> UUID
unOrganizationId (OrganizationId i) = i

unWorkflowStateId :: WorkflowStateId -> UUID
unWorkflowStateId (WorkflowStateId i) = i

unWorkflowInstanceId :: WorkflowInstanceId -> UUID
unWorkflowInstanceId (WorkflowInstanceId i) = i

unUserId :: UserId -> UUID
unUserId (UserId i) = i

unWorkflowAction :: WorkflowAction -> Text
unWorkflowAction (WorkflowAction a) = a
