{-# LANGUAGE OverloadedStrings #-}

module FlowForge.Infrastructure.Repositories.Audit 
  ( auditRepository
  ) where

import FlowForge.Domain.Types
import FlowForge.Application.Ports
import FlowForge.Application.Error
import FlowForge.Infrastructure.Database
import Database.PostgreSQL.Simple
import Data.UUID (UUID)
import Data.Text (Text)
import Control.Exception (try, SomeException)
import Control.Monad.Trans.Reader (ask)
import Control.Monad.IO.Class (liftIO)

mapOrgId :: OrganizationId -> UUID
mapOrgId (OrganizationId u) = u

mapInstId :: WorkflowInstanceId -> UUID
mapInstId (WorkflowInstanceId u) = u

mapUserId :: UserId -> UUID
mapUserId (UserId u) = u

mapStateId :: WorkflowStateId -> UUID
mapStateId (WorkflowStateId u) = u

mapAction :: WorkflowAction -> Text
mapAction (WorkflowAction t) = t

auditRepository :: AuditRepository SqlM
auditRepository = AuditRepository
  { appendAuditEvent = \event -> do
      conn <- ask
      res <- liftIO $ try $ execute conn 
        "INSERT INTO audit_entries (organization_id, workflow_instance_id, actor_id, previous_state_id, action, resulting_state_id) \
        \VALUES (?, ?, ?, ?, ?, ?)"
        ( mapOrgId (aeOrgId event)
        , mapInstId (aeInstanceId event)
        , mapUserId (aeActorId event)
        , mapStateId (aePreviousStateId event)
        , mapAction (aeAction event)
        , mapStateId (aeResultingStateId event)
        )
      case res of
        Left err -> return $ Left $ PersistenceFailure (show (err :: SomeException))
        Right _ -> return $ Right ()

  , getAuditEvents = \orgId instId -> do
      conn <- ask
      res <- liftIO $ try $ query conn
        "SELECT actor_id, previous_state_id, action, resulting_state_id \
        \FROM audit_entries \
        \WHERE organization_id = ? AND workflow_instance_id = ? \
        \ORDER BY created_at ASC"
        (mapOrgId orgId, mapInstId instId)
      case res of
        Left err -> return $ Left $ PersistenceFailure (show (err :: SomeException))
        Right rows -> return $ Right $ map (toDomain orgId instId) rows
  }

toDomain :: OrganizationId -> WorkflowInstanceId -> (UUID, UUID, Text, UUID) -> AuditEvent
toDomain orgId instId (actorU, prevU, actT, resU) = AuditEvent
  { aeOrgId = orgId
  , aeInstanceId = instId
  , aeActorId = UserId actorU
  , aePreviousStateId = WorkflowStateId prevU
  , aeAction = WorkflowAction actT
  , aeResultingStateId = WorkflowStateId resU
  }
