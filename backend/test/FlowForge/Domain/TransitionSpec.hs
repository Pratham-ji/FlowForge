{-# LANGUAGE OverloadedStrings #-}

module FlowForge.Domain.TransitionSpec (spec) where

import Test.Hspec
import Test.QuickCheck
import Data.UUID (fromWords)
import FlowForge.Domain.Types
import FlowForge.Domain.Error
import FlowForge.Domain.Transition
import qualified Data.Text as T
import Data.Word (Word32)

mkStateId :: Word32 -> WorkflowStateId
mkStateId w = WorkflowStateId (fromWords 0 0 0 w)

mkTransId :: Word32 -> TransitionId
mkTransId w = TransitionId (fromWords 0 0 0 w)

userIdVal :: UserId
userIdVal = UserId (fromWords 0 0 0 99)

testOrgId :: OrganizationId
testOrgId = OrganizationId (fromWords 0 0 0 1)

wId_ :: WorkflowId
wId_ = WorkflowId (fromWords 0 0 0 1)

instId :: WorkflowInstanceId
instId = WorkflowInstanceId (fromWords 0 0 0 1)

validWorkflow :: Workflow
validWorkflow = Workflow
  { wId = wId_
  , wOrgId = testOrgId
  , wName = "Valid"
  , wLifecycle = Active
  , wInitialStateId = mkStateId 1
  , wStates =
      [ WorkflowState (mkStateId 1) "Draft" False
      , WorkflowState (mkStateId 2) "Review" False
      , WorkflowState (mkStateId 3) "Done" True
      ]
  , wTransitions =
      [ WorkflowTransition (mkTransId 1) (mkStateId 1) (mkStateId 2) (WorkflowAction "Submit") TransitionInstance
      , WorkflowTransition (mkTransId 2) (mkStateId 2) (mkStateId 3) (WorkflowAction "Approve") TransitionInstance
      , WorkflowTransition (mkTransId 3) (mkStateId 2) (mkStateId 1) (WorkflowAction "Reject") TransitionInstance
      ]
  }

baseInst :: WorkflowInstance
baseInst = WorkflowInstance
  { wiId = instId
  , wiWorkflowId = wId_
  , wiOrgId = testOrgId
  , wiCurrentStateId = mkStateId 1
  , wiCreatedBy = userIdVal
  }

spec :: Spec
spec = do
  describe "Transitions" $ do
    it "succeeds on valid transition" $ do
      let res = transition validWorkflow baseInst userIdVal Member (WorkflowAction "Submit")
      fmap (wiCurrentStateId . fst) res `shouldBe` Right (mkStateId 2)
      fmap (aePreviousStateId . snd) res `shouldBe` Right (mkStateId 1)
      fmap (aeResultingStateId . snd) res `shouldBe` Right (mkStateId 2)
      fmap (aeAction . snd) res `shouldBe` Right (WorkflowAction "Submit")
      fmap (wiId . fst) res `shouldBe` Right (wiId baseInst)

    it "rejects invalid transition" $ do
      let res = transition validWorkflow baseInst userIdVal Member (WorkflowAction "Approve")
      res `shouldBe` Left (InvalidTransition (mkStateId 1) (WorkflowAction "Approve"))

    it "rejects transition if wrong permission" $ do
      -- Needs TransitionInstance permission, let's say Viewer doesn't have it
      let res = transition validWorkflow baseInst userIdVal Viewer (WorkflowAction "Submit")
      res `shouldBe` Left (PermissionDenied (WorkflowAction "Submit") TransitionInstance)

    it "rejects transition from terminal state" $ do
      let inst = baseInst { wiCurrentStateId = mkStateId 3 }
      let res = transition validWorkflow inst userIdVal Member (WorkflowAction "Submit")
      res `shouldBe` Left (WorkflowAlreadyCompleted (mkStateId 3))

    it "rejects if workflow is not active" $ do
      let badW = validWorkflow { wLifecycle = Draft }
      let res = transition badW baseInst userIdVal Member (WorkflowAction "Submit")
      res `shouldBe` Left (WorkflowNotActive Draft)

    it "rejects if OrganizationMismatch" $ do
      let badOrg = OrganizationId (fromWords 0 0 0 999)
      let inst = baseInst { wiOrgId = badOrg }
      let res = transition validWorkflow inst userIdVal Member (WorkflowAction "Submit")
      res `shouldBe` Left (OrganizationMismatch badOrg testOrgId)

    it "rejects if WorkflowInstanceMismatch" $ do
      let badWId = WorkflowId (fromWords 0 0 0 999)
      let inst = baseInst { wiWorkflowId = badWId }
      let res = transition validWorkflow inst userIdVal Member (WorkflowAction "Submit")
      res `shouldBe` Left (WorkflowInstanceMismatch badWId wId_)

  describe "Properties" $ do
    it "fails when action does not match any transition from current state" $ property $
      forAll genAction $ \action -> do
        let edges = filter (\t -> wtSourceStateId t == wiCurrentStateId baseInst && wtAction t == action) (wTransitions validWorkflow)
        if null edges
          then case transition validWorkflow baseInst userIdVal Member action of
                 Left _ -> True
                 Right _ -> False
          else True -- ignore matches for this property

    it "transitions to target state when valid action and permission exist" $ property $
      forAll (elements (wTransitions validWorkflow)) $ \edge -> do
        let inst = baseInst { wiCurrentStateId = wtSourceStateId edge }
        case transition validWorkflow inst userIdVal Admin (wtAction edge) of
          Right (newInst, _) -> wiCurrentStateId newInst == wtTargetStateId edge
          Left _ -> False

genAction :: Gen WorkflowAction
genAction = frequency
  [ (8, elements [WorkflowAction "Submit", WorkflowAction "Approve", WorkflowAction "Reject"])
  , (2, WorkflowAction . T.pack <$> listOf (elements ['a'..'z']))
  ]
