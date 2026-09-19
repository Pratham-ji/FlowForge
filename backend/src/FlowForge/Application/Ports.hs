{-# LANGUAGE RankNTypes #-}

module FlowForge.Application.Ports 
  ( WorkflowRepository(..)
  , WorkflowInstanceRepository(..)
  , AuditRepository(..)
  , TransactionPort(..)
  ) where

import FlowForge.Domain.Types
import FlowForge.Application.Error

-- | Repository for Workflow definition persistence
data WorkflowRepository m = WorkflowRepository
  { saveWorkflow :: Workflow -> m (Either AppError ())
  , getWorkflow  :: OrganizationId -> WorkflowId -> m (Either AppError Workflow)
  }

-- | Repository for WorkflowInstance persistence (includes version for optimistic concurrency)
data WorkflowInstanceRepository m = WorkflowInstanceRepository
  { saveWorkflowInstance :: WorkflowInstance -> Int -> m (Either AppError ())
  , getWorkflowInstance  :: OrganizationId -> WorkflowInstanceId -> m (Either AppError (WorkflowInstance, Int))
  }

-- | Repository for appending AuditEvents
data AuditRepository m = AuditRepository
  { appendAuditEvent :: AuditEvent -> m (Either AppError ())
  , getAuditHistory  :: OrganizationId -> WorkflowInstanceId -> m (Either AppError [AuditEvent])
  }

-- | Port for managing database transaction boundaries
data TransactionPort m = TransactionPort
  { withTransaction :: forall a. m (Either AppError a) -> m (Either AppError a)
  }
