{-# LANGUAGE OverloadedStrings #-}

module FlowForge.Infrastructure.IntegrationSpec (spec) where

import Test.Hspec
import Database.PostgreSQL.Simple hiding (withTransaction)
import Database.PostgreSQL.Simple.Types (Query(..))
import Data.Pool
import Data.UUID (UUID, fromWords)
import qualified Data.ByteString.Char8 as B
import Control.Monad.IO.Class (liftIO)
import Data.Word (Word32)
import FlowForge.Infrastructure.Database
import FlowForge.Infrastructure.Transaction
import FlowForge.Infrastructure.Repositories.Workflow
import FlowForge.Infrastructure.Repositories.Instance
import FlowForge.Application.Ports
import FlowForge.Domain.Types
import FlowForge.Application.Error

setupDb :: DbPool -> IO ()
setupDb pool = withResource pool $ \conn -> do
  _ <- execute_ conn "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
  schemaSql <- B.readFile "migrations/001_initial_schema.sql"
  _ <- execute_ conn (Query schemaSql)
  return ()

mkId :: Word32 -> UUID
mkId w = fromWords 0 0 0 w

org1Id, org2Id :: OrganizationId
org1Id = OrganizationId (mkId 1)
org2Id = OrganizationId (mkId 2)

u1Id :: UserId
u1Id = UserId (mkId 100)

wfId :: WorkflowId
wfId = WorkflowId (mkId 200)

st1, st2, st3 :: WorkflowStateId
st1 = WorkflowStateId (mkId 301)
st2 = WorkflowStateId (mkId 302)
st3 = WorkflowStateId (mkId 303)

t1 :: TransitionId
t1 = TransitionId (mkId 401)

instId :: WorkflowInstanceId
instId = WorkflowInstanceId (mkId 500)

insertBaseData :: DbPool -> IO ()
insertBaseData pool = withResource pool $ \conn -> do
  _ <- execute conn "INSERT INTO organizations (id) VALUES (?)" (Only (mkId 1))
  _ <- execute conn "INSERT INTO organizations (id) VALUES (?)" (Only (mkId 2))
  _ <- execute conn "INSERT INTO users (id, organization_id, role) VALUES (?, ?, 'Admin')" (mkId 100, mkId 1)
  return ()

baseWf :: Workflow
baseWf = Workflow
  { wId = wfId
  , wOrgId = org1Id
  , wName = "Test Workflow"
  , wLifecycle = Draft
  , wInitialStateId = st1
  , wStates = 
    [ WorkflowState st1 "Init" False
    , WorkflowState st2 "Review" False
    , WorkflowState st3 "Done" True
    ]
  , wTransitions = 
    [ WorkflowTransition t1 st1 st2 (WorkflowAction "Submit") TransitionInstance
    ]
  }

spec :: Spec
spec = do
  describe "PostgreSQL Integration" $ around (\action -> do
      pool <- initDbPool "host=localhost dbname=flowforge_test user=postgres"
      setupDb pool
      insertBaseData pool
      action pool
      closeDbPool pool
    ) $ do
    
    it "saves and retrieves a workflow successfully" $ \pool -> runSqlM pool $ do
      let wRepo = workflowRepository
      res <- saveWorkflow wRepo baseWf
      liftIO $ res `shouldBe` Right ()
      
      ret <- getWorkflow wRepo org1Id wfId
      liftIO $ case ret of
        Right w -> do
          wName w `shouldBe` "Test Workflow"
          length (wStates w) `shouldBe` 3
          length (wTransitions w) `shouldBe` 1
        Left err -> expectationFailure (show err)

    it "rejects duplicate state names (Constraint Test A)" $ \pool -> runSqlM pool $ do
      let wRepo = workflowRepository
      let badWf = baseWf { wStates = [WorkflowState st1 "Init" False, WorkflowState st2 "Init" False] }
      res <- saveWorkflow wRepo badWf
      liftIO $ case res of
        Left (PersistenceFailure err) -> err `shouldContain` "duplicate key value violates unique constraint"
        _ -> expectationFailure "Expected database constraint failure"

    it "rejects duplicate transition business keys (Constraint Test B)" $ \pool -> runSqlM pool $ do
      let wRepo = workflowRepository
      let badWf = baseWf { wTransitions = 
            [ WorkflowTransition t1 st1 st2 (WorkflowAction "Submit") TransitionInstance
            , WorkflowTransition (TransitionId (mkId 402)) st1 st3 (WorkflowAction "Submit") TransitionInstance
            ] 
          }
      res <- saveWorkflow wRepo badWf
      liftIO $ case res of
        Left (PersistenceFailure err) -> err `shouldContain` "duplicate key value violates unique constraint"
        _ -> expectationFailure "Expected database constraint failure"

    it "enforces tenant isolation" $ \pool -> runSqlM pool $ do
      let wRepo = workflowRepository
      _ <- saveWorkflow wRepo baseWf
      
      ret <- getWorkflow wRepo org2Id wfId
      liftIO $ ret `shouldBe` Left (WorkflowNotFound wfId)

    it "saves and retrieves a workflow instance" $ \pool -> runSqlM pool $ do
      let wRepo = workflowRepository
      let iRepo = workflowInstanceRepository
      _ <- saveWorkflow wRepo baseWf
      
      let inst = WorkflowInstance instId wfId org1Id st1 u1Id
      res <- saveWorkflowInstance iRepo inst 1
      liftIO $ res `shouldBe` Right ()
      
      ret <- getWorkflowInstance iRepo org1Id instId
      liftIO $ case ret of
        Right (i, v) -> do
          wiCurrentStateId i `shouldBe` st1
          v `shouldBe` 1
        Left err -> expectationFailure (show err)

    it "enforces optimistic concurrency" $ \pool -> runSqlM pool $ do
      let wRepo = workflowRepository
      let iRepo = workflowInstanceRepository
      _ <- saveWorkflow wRepo baseWf
      
      let inst = WorkflowInstance instId wfId org1Id st1 u1Id
      _ <- saveWorkflowInstance iRepo inst 1
      
      let inst' = inst { wiCurrentStateId = st2 }
      res1 <- saveWorkflowInstance iRepo inst' 2
      liftIO $ res1 `shouldBe` Right ()
      
      let inst'' = inst { wiCurrentStateId = st3 }
      res2 <- saveWorkflowInstance iRepo inst'' 2 
      liftIO $ res2 `shouldBe` Left (ConcurrencyConflict instId)

    it "rolls back transaction on Left AppError" $ \pool -> runSqlM pool $ do
      let wRepo = workflowRepository
      let iRepo = workflowInstanceRepository
      let txPort = transactionPort
      
      let activeWf = baseWf { wLifecycle = Active }
      _ <- saveWorkflow wRepo activeWf
      let inst = WorkflowInstance instId wfId org1Id st1 u1Id
      _ <- saveWorkflowInstance iRepo inst 1
      
      let fakeAction = withTransaction txPort $ do
            _ <- saveWorkflowInstance iRepo inst 2 
            return $ Left (Unauthorized u1Id)
      
      _ <- fakeAction
      
      ret <- getWorkflowInstance iRepo org1Id instId
      liftIO $ case ret of
        Right (_, v) -> v `shouldBe` 1
        Left err -> expectationFailure (show err)
