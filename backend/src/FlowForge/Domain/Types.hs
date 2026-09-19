{-# LANGUAGE OverloadedStrings #-}

module FlowForge.Domain.Types
  ( OrganizationId (..)
  , UserId (..)
  , User (..)
  , WorkflowId (..)
  , WorkflowInstanceId (..)
  , WorkflowStateId (..)
  , TransitionId (..)
  , AuditEntryId (..)
  , Role (..)
  , Permission (..)
  , WorkflowLifecycle (..)
  , WorkflowAction (..)
  , WorkflowState (..)
  , WorkflowTransition (..)
  , Workflow (..)
  , WorkflowInstance (..)
  , AuditEvent (..)
  ) where

import Data.UUID (UUID)
import Data.Text (Text)

newtype OrganizationId = OrganizationId UUID deriving (Eq, Ord, Show)
newtype UserId = UserId UUID deriving (Eq, Ord, Show)
data User = User { uId :: UserId, uOrganizationId :: OrganizationId, uRole :: Role } deriving (Eq, Show)
newtype WorkflowId = WorkflowId UUID deriving (Eq, Ord, Show)
newtype WorkflowInstanceId = WorkflowInstanceId UUID deriving (Eq, Ord, Show)
newtype WorkflowStateId = WorkflowStateId UUID deriving (Eq, Ord, Show)
newtype TransitionId = TransitionId UUID deriving (Eq, Ord, Show)
newtype AuditEntryId = AuditEntryId UUID deriving (Eq, Ord, Show)

data Role
  = Admin
  | Manager
  | Member
  | Viewer
  deriving (Eq, Show, Enum, Bounded)

data Permission
  = ManageOrganization
  | CreateWorkflow
  | ReadWorkflow
  | UpdateWorkflow
  | DeleteWorkflow
  | CreateInstance
  | ReadInstance
  | TransitionInstance
  | ReadAudit
  deriving (Eq, Show, Enum, Bounded)

data WorkflowLifecycle
  = Draft
  | Active
  | Archived
  deriving (Eq, Show, Enum, Bounded)

newtype WorkflowAction = WorkflowAction Text deriving (Eq, Ord, Show)

data WorkflowState = WorkflowState
  { wsId :: WorkflowStateId
  , wsName :: Text
  , wsIsTerminal :: Bool
  } deriving (Eq, Show)

data WorkflowTransition = WorkflowTransition
  { wtId :: TransitionId
  , wtSourceStateId :: WorkflowStateId
  , wtTargetStateId :: WorkflowStateId
  , wtAction :: WorkflowAction
  , wtRequiredPermission :: Permission
  } deriving (Eq, Show)

data Workflow = Workflow
  { wId :: WorkflowId
  , wOrgId :: OrganizationId
  , wName :: Text
  , wLifecycle :: WorkflowLifecycle
  , wInitialStateId :: WorkflowStateId
  , wStates :: [WorkflowState]
  , wTransitions :: [WorkflowTransition]
  } deriving (Eq, Show)

data WorkflowInstance = WorkflowInstance
  { wiId :: WorkflowInstanceId
  , wiWorkflowId :: WorkflowId
  , wiOrgId :: OrganizationId
  , wiCurrentStateId :: WorkflowStateId
  , wiCreatedBy :: UserId
  } deriving (Eq, Show)

data AuditEvent = AuditEvent
  { aeOrgId :: OrganizationId
  , aeInstanceId :: WorkflowInstanceId
  , aeActorId :: UserId
  , aePreviousStateId :: WorkflowStateId
  , aeAction :: WorkflowAction
  , aeResultingStateId :: WorkflowStateId
  } deriving (Eq, Show)
