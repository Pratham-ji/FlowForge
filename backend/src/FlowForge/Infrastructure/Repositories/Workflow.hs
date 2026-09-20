{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE TupleSections #-}

module FlowForge.Infrastructure.Repositories.Workflow
  ( workflowRepository
  ) where

import FlowForge.Domain.Types
import FlowForge.Application.Ports hiding (withTransaction)
import FlowForge.Application.Error
import FlowForge.Infrastructure.Database
import Database.PostgreSQL.Simple
import Database.PostgreSQL.Simple.Types (In(In))
import Data.UUID (UUID)
import Data.Text (Text)
import qualified Data.Text as T
import Control.Exception (try, SomeException)
import Control.Monad.Trans.Reader (ask)
import Control.Monad.IO.Class (liftIO)

mapOrgId :: OrganizationId -> UUID
mapOrgId (OrganizationId u) = u

mapWfId :: WorkflowId -> UUID
mapWfId (WorkflowId u) = u

mapStateId :: WorkflowStateId -> UUID
mapStateId (WorkflowStateId u) = u

mapTransId :: TransitionId -> UUID
mapTransId (TransitionId u) = u

mapAction :: WorkflowAction -> Text
mapAction (WorkflowAction t) = t

-- Helper for Lifecycle enum
lcToText :: WorkflowLifecycle -> Text
lcToText Draft = "Draft"
lcToText Active = "Active"
lcToText Archived = "Archived"

textToLc :: Text -> WorkflowLifecycle
textToLc "Draft" = Draft
textToLc "Active" = Active
textToLc "Archived" = Archived
textToLc _ = Draft

-- Helper for Permission enum
permToText :: Permission -> Text
permToText = T.pack . show

textToPerm :: Text -> Permission
textToPerm "ManageOrganization" = ManageOrganization
textToPerm "CreateWorkflow" = CreateWorkflow
textToPerm "ReadWorkflow" = ReadWorkflow
textToPerm "UpdateWorkflow" = UpdateWorkflow
textToPerm "DeleteWorkflow" = DeleteWorkflow
textToPerm "CreateInstance" = CreateInstance
textToPerm "ReadInstance" = ReadInstance
textToPerm "TransitionInstance" = TransitionInstance
textToPerm "ReadAudit" = ReadAudit
textToPerm _ = ReadWorkflow -- Safe fallback


workflowRepository :: WorkflowRepository SqlM
workflowRepository = WorkflowRepository
  { saveWorkflow = \w -> do
      conn <- ask
      -- To handle states and transitions cleanly, we usually wrap in a transaction,
      -- delete existing states/transitions, and insert new.
      res <- liftIO $ try $ withTransaction conn $ do
        _ <- execute conn
          "INSERT INTO workflows (id, organization_id, name, lifecycle, initial_state_id) \
          \VALUES (?, ?, ?, ?, ?) \
          \ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, lifecycle = EXCLUDED.lifecycle, initial_state_id = EXCLUDED.initial_state_id, updated_at = NOW()"
          ( mapWfId (wId w), mapOrgId (wOrgId w), wName w, lcToText (wLifecycle w), mapStateId (wInitialStateId w) )

        _ <- execute conn "DELETE FROM workflow_states WHERE workflow_id = ?" (Only (mapWfId (wId w)))

        let stateRows = map (\s -> (mapStateId (wsId s), mapWfId (wId w), wsName s, wsIsTerminal s)) (wStates w)
        _ <- executeMany conn
          "INSERT INTO workflow_states (id, workflow_id, name, is_terminal) VALUES (?, ?, ?, ?)"
          stateRows

        let transRows = map (\t -> (mapTransId (wtId t), mapWfId (wId w), mapStateId (wtSourceStateId t), mapStateId (wtTargetStateId t), mapAction (wtAction t), permToText (wtRequiredPermission t))) (wTransitions w)
        _ <- executeMany conn
          "INSERT INTO workflow_transitions (id, workflow_id, source_state_id, target_state_id, action, required_permission) VALUES (?, ?, ?, ?, ?, ?)"
          transRows
        return ()

      case res of
        Left err -> return $ Left $ PersistenceFailure (show (err :: SomeException))
        Right _ -> return $ Right ()

  , getWorkflow = \orgId wfId -> do
      conn <- ask
      res <- liftIO $ try $ do
        ws <- query conn
          "SELECT name, lifecycle, initial_state_id FROM workflows WHERE id = ? AND organization_id = ?"
          (mapWfId wfId, mapOrgId orgId)

        case ws of
          [] -> return $ Left $ WorkflowNotFound wfId
          [(n, lc, initSt)] -> do
            states <- query conn "SELECT id, name, is_terminal FROM workflow_states WHERE workflow_id = ?" (Only (mapWfId wfId))
            trans <- query conn "SELECT id, source_state_id, target_state_id, action, required_permission FROM workflow_transitions WHERE workflow_id = ?" (Only (mapWfId wfId))

            let domainStates = map (\(u, nm, term) -> WorkflowState (WorkflowStateId u) nm term) states
            let domainTrans = map (\(u, src, tgt, act, perm) -> WorkflowTransition (TransitionId u) (WorkflowStateId src) (WorkflowStateId tgt) (WorkflowAction act) (textToPerm perm)) trans

            return $ Right Workflow
              { wId = wfId
              , wOrgId = orgId
              , wName = n
              , wLifecycle = textToLc lc
              , wInitialStateId = WorkflowStateId initSt
              , wStates = domainStates
              , wTransitions = domainTrans
              }
          _ -> return $ Left $ PersistenceFailure "Multiple workflows returned for one ID"

      case res of
        Left err -> return $ Left $ PersistenceFailure (show (err :: SomeException))
        Right val -> return val
  , listWorkflows = \orgId -> do
      conn <- ask
      res <- liftIO $ try $ do
        ws <- query conn
          "SELECT id, name, lifecycle, initial_state_id FROM workflows WHERE organization_id = ?"
          (Only (mapOrgId orgId)) :: IO [(UUID, Text, Text, UUID)]

        if null ws
          then return (Right [])
          else do
            let wfIds = map (\(wIdU, _, _, _) -> wIdU) ws
            
            states <- query conn
              "SELECT id, workflow_id, name, is_terminal FROM workflow_states WHERE workflow_id IN ? AND workflow_id IN (SELECT id FROM workflows WHERE organization_id = ?)"
              (In wfIds, mapOrgId orgId) :: IO [(UUID, UUID, Text, Bool)]
              
            trans <- query conn
              "SELECT id, workflow_id, source_state_id, target_state_id, action, required_permission FROM workflow_transitions WHERE workflow_id IN ? AND workflow_id IN (SELECT id FROM workflows WHERE organization_id = ?)"
              (In wfIds, mapOrgId orgId) :: IO [(UUID, UUID, UUID, UUID, Text, Text)]

            let domainWfs = map (\(wIdU, n, lc, initSt) -> 
                  let 
                    wfStates = [ WorkflowState (WorkflowStateId u) nm term | (u, wid, nm, term) <- states, wid == wIdU ]
                    wfTrans = [ WorkflowTransition (TransitionId u) (WorkflowStateId src) (WorkflowStateId tgt) (WorkflowAction act) (textToPerm perm) | (u, wid, src, tgt, act, perm) <- trans, wid == wIdU ]
                  in Workflow
                    { wId = WorkflowId wIdU
                    , wOrgId = orgId
                    , wName = n
                    , wLifecycle = textToLc lc
                    , wInitialStateId = WorkflowStateId initSt
                    , wStates = wfStates
                    , wTransitions = wfTrans
                    }
                  ) ws
            return (Right domainWfs)

      case res of
        Left err -> return $ Left $ PersistenceFailure (show (err :: SomeException))
        Right val -> return val
  }
