{-# LANGUAGE RankNTypes #-}
{-# LANGUAGE ExplicitForAll #-}

module FlowForge.Application.Ports
  ( WorkflowRepository(..)
  , InstanceRepository(..)
  , AuditRepository(..)
  , UserRepository(..)
  , PasswordVerifier(..)
  , TransactionPort(..)
  ) where

import Data.Text (Text)
import FlowForge.Domain.Types
import FlowForge.Application.Error

data WorkflowRepository m = WorkflowRepository
  { saveWorkflow :: Workflow -> m (Either AppError ())
  , getWorkflow  :: OrganizationId -> WorkflowId -> m (Either AppError Workflow)
  , listWorkflows :: OrganizationId -> m (Either AppError [Workflow])
  }

data InstanceRepository m = InstanceRepository
  { saveWorkflowInstance :: WorkflowInstance -> Int -> m (Either AppError ())
  , getWorkflowInstance  :: OrganizationId -> WorkflowInstanceId -> m (Either AppError (WorkflowInstance, Int))
  , listWorkflowInstances :: OrganizationId -> WorkflowId -> m (Either AppError [(WorkflowInstance, Int)])
  }

data AuditRepository m = AuditRepository
  { appendAuditEvent :: AuditEvent -> m (Either AppError ())
  , getAuditEvents   :: OrganizationId -> WorkflowInstanceId -> m (Either AppError [AuditEvent])
  }

data UserRepository m = UserRepository
  { getUserByEmail :: Text -> m (Either AppError (User, Text)) -- Returns (User, PasswordHash)
  }

data PasswordVerifier m = PasswordVerifier
  { verifyPassword :: Text -> Text -> m Bool -- verifyPassword plaintext hash
  }

data TransactionPort m = TransactionPort
  { withTransaction :: forall a. m (Either AppError a) -> m (Either AppError a)
  }
