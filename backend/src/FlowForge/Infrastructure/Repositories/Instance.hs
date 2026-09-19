{-# LANGUAGE OverloadedStrings #-}

module FlowForge.Infrastructure.Repositories.Instance
  ( workflowInstanceRepository
  ) where

import FlowForge.Domain.Types
import FlowForge.Application.Ports
import FlowForge.Application.Error
import FlowForge.Infrastructure.Database
import Database.PostgreSQL.Simple
import Data.UUID (UUID)
import Control.Exception (try, SomeException)
import Data.Int (Int64)

import Control.Monad.Trans.Reader (ask)
import Control.Monad.IO.Class (liftIO)

mapOrgId :: OrganizationId -> UUID
mapOrgId (OrganizationId u) = u

mapInstId :: WorkflowInstanceId -> UUID
mapInstId (WorkflowInstanceId u) = u

mapWfId :: WorkflowId -> UUID
mapWfId (WorkflowId u) = u

mapUserId :: UserId -> UUID
mapUserId (UserId u) = u

mapStateId :: WorkflowStateId -> UUID
mapStateId (WorkflowStateId u) = u

workflowInstanceRepository :: WorkflowInstanceRepository SqlM
workflowInstanceRepository = WorkflowInstanceRepository
  { saveWorkflowInstance = \inst version -> do
      conn <- ask
      if version == 1 then do
        -- Insert new
        res <- liftIO $ try $ execute conn 
          "INSERT INTO workflow_instances (id, workflow_id, organization_id, current_state_id, created_by, version) \
          \VALUES (?, ?, ?, ?, ?, ?)"
          ( mapInstId (wiId inst)
          , mapWfId (wiWorkflowId inst)
          , mapOrgId (wiOrgId inst)
          , mapStateId (wiCurrentStateId inst)
          , mapUserId (wiCreatedBy inst)
          , version
          )
        case res of
          Left err -> return $ Left $ PersistenceFailure (show (err :: SomeException))
          Right _ -> return $ Right ()
      else do
        -- Update existing with optimistic concurrency
        res <- liftIO $ try $ execute conn 
          "UPDATE workflow_instances \
          \SET current_state_id = ?, version = ?, updated_at = NOW() \
          \WHERE id = ? AND version = ?"
          ( mapStateId (wiCurrentStateId inst)
          , version
          , mapInstId (wiId inst)
          , version - 1
          )
        case res of
          Left err -> return $ Left $ PersistenceFailure (show (err :: SomeException))
          Right affected -> 
            if (affected :: Int64) == 0 
              then return $ Left $ ConcurrencyConflict (wiId inst)
              else return $ Right ()

  , getWorkflowInstance = \orgId instId -> do
      conn <- ask
      res <- liftIO $ try $ query conn
        "SELECT workflow_id, current_state_id, created_by, version \
        \FROM workflow_instances \
        \WHERE id = ? AND organization_id = ?"
        (mapInstId instId, mapOrgId orgId)
      case res of
        Left err -> return $ Left $ PersistenceFailure (show (err :: SomeException))
        Right [] -> return $ Left $ WorkflowInstanceNotFound instId
        Right [(wIdU, stU, crU, v)] -> return $ Right 
          ( WorkflowInstance
              { wiId = instId
              , wiWorkflowId = WorkflowId wIdU
              , wiOrgId = orgId
              , wiCurrentStateId = WorkflowStateId stU
              , wiCreatedBy = UserId crU
              }
          , v
          )
        Right _ -> return $ Left $ PersistenceFailure "Multiple instances returned for one ID"
  }
