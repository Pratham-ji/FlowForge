{-# LANGUAGE OverloadedStrings #-}

module FlowForge.Application.UseCasesSpec (spec) where

import Test.Hspec
import Data.IORef
import Data.UUID (UUID, fromWords)
import FlowForge.Domain.Types
import FlowForge.Application.Ports
import FlowForge.Application.Error
import FlowForge.Application.UseCases.Instance
import qualified Data.Map as Map
import Data.Word (Word32)

mkId :: Word32 -> UUID
mkId w = fromWords 0 0 0 w

spec :: Spec
spec = do
  describe "Application Use Cases" $ do
    it "creates an instance and saves to repository" $ do
      -- Fake DBs
      wDb <- newIORef Map.empty
      iDb <- newIORef Map.empty
      aDb <- newIORef []

      let orgId = OrganizationId (mkId 1)
          wfId_ = WorkflowId (mkId 1)
          userIdVal = UserId (mkId 1)
          stateId = WorkflowStateId (mkId 1)
          instId = WorkflowInstanceId (mkId 1)
          
          testWf = Workflow wfId_ orgId "Test" Active stateId [WorkflowState stateId "Init" False] []
      
      modifyIORef wDb (Map.insert wfId_ testWf)

      let wRepo = WorkflowRepository 
            { saveWorkflow = \w -> do modifyIORef wDb (Map.insert (wId w) w); return (Right ())
            , getWorkflow = \o wfId -> do 
                db <- readIORef wDb
                case Map.lookup wfId db of
                  Just w -> if wOrgId w == o then return (Right w) else return (Left (TenantMismatch o (wOrgId w)))
                  Nothing -> return (Left (WorkflowNotFound wfId))
            , listWorkflows = \o -> do
                db <- readIORef wDb
                return $ Right [w | w <- Map.elems db, wOrgId w == o]
            }
          iRepo = InstanceRepository
            { saveWorkflowInstance = \inst v -> do modifyIORef iDb (Map.insert (wiId inst) (inst, v)); return (Right ())
            , getWorkflowInstance = \o iId -> do
                db <- readIORef iDb
                case Map.lookup iId db of
                  Just (inst, v) -> if wiOrgId inst == o then return (Right (inst, v)) else return (Left (TenantMismatch o (wiOrgId inst)))
                  Nothing -> return (Left (WorkflowInstanceNotFound iId))
            , listWorkflowInstances = \o wfId' -> do
                db <- readIORef iDb
                return $ Right [(inst, v) | (inst, v) <- Map.elems db, wiOrgId inst == o, wiWorkflowId inst == wfId']
            }
          aRepo = AuditRepository
            { appendAuditEvent = \e -> do modifyIORef aDb (e:); return (Right ())
            , getAuditEvents = \_ _ -> return (Right [])
            }
          txPort = TransactionPort { withTransaction = id }

      -- Act
      _ <- executeWorkflowTransitionUC txPort wRepo iRepo aRepo orgId userIdVal Member instId (WorkflowAction "Submit")
      res <- createWorkflowInstanceUC wRepo iRepo orgId userIdVal Member wfId_ instId

      -- Assert
      case res of
        Left err -> expectationFailure (show err)
        Right inst -> wiId inst `shouldBe` instId

      -- Verify DB state
      iState <- readIORef iDb
      Map.size iState `shouldBe` 1
