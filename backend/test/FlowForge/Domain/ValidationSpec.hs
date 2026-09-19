{-# LANGUAGE OverloadedStrings #-}

module FlowForge.Domain.ValidationSpec (spec) where

import Test.Hspec
import Data.UUID (fromWords)
import FlowForge.Domain.Types
import FlowForge.Domain.Error
import FlowForge.Domain.Validation
import Data.Word (Word32)

mkStateId :: Word32 -> WorkflowStateId
mkStateId w = WorkflowStateId (fromWords 0 0 0 w)

mkTransId :: Word32 -> TransitionId
mkTransId w = TransitionId (fromWords 0 0 0 w)

validWorkflow :: Workflow
validWorkflow = Workflow
  { wId = WorkflowId (fromWords 0 0 0 1)
  , wOrgId = OrganizationId (fromWords 0 0 0 1)
  , wName = "Valid"
  , wLifecycle = Draft
  , wInitialStateId = mkStateId 1
  , wStates = 
      [ WorkflowState (mkStateId 1) "Start" False
      , WorkflowState (mkStateId 2) "End" True
      ]
  , wTransitions = 
      [ WorkflowTransition (mkTransId 1) (mkStateId 1) (mkStateId 2) (WorkflowAction "Finish") TransitionInstance
      ]
  }

spec :: Spec
spec = do
  describe "Workflow Validation" $ do
    it "accepts a valid workflow" $ do
      validateWorkflow validWorkflow `shouldBe` Right ()

    it "rejects missing initial state" $ do
      let badW = validWorkflow { wInitialStateId = mkStateId 99 }
      validateWorkflow badW `shouldBe` Left (InvalidInitialState (mkStateId 99))

    it "rejects duplicate state IDs" $ do
      let s1 = WorkflowState (mkStateId 1) "S1" False
          s2 = WorkflowState (mkStateId 1) "S2" False
          badW = validWorkflow { wStates = [s1, s2] }
      validateWorkflow badW `shouldBe` Left (DuplicateState (mkStateId 1))

    it "rejects duplicate state names" $ do
      let s1 = WorkflowState (mkStateId 1) "SameName" False
          s2 = WorkflowState (mkStateId 2) "SameName" False
          badW = validWorkflow { wStates = [s1, s2] }
      validateWorkflow badW `shouldBe` Left DuplicateStateName

    it "rejects dangling transition source" $ do
      let t = WorkflowTransition (mkTransId 9) (mkStateId 99) (mkStateId 2) (WorkflowAction "A") TransitionInstance
          badW = validWorkflow { wTransitions = [t] }
      validateWorkflow badW `shouldBe` Left (DanglingTransitionSource (mkTransId 9) (mkStateId 99))

    it "rejects dangling transition target" $ do
      let t = WorkflowTransition (mkTransId 9) (mkStateId 1) (mkStateId 99) (WorkflowAction "A") TransitionInstance
          badW = validWorkflow { wTransitions = [t] }
      validateWorkflow badW `shouldBe` Left (DanglingTransitionTarget (mkTransId 9) (mkStateId 99))

    it "rejects duplicate transition semantics (same source and action)" $ do
      let t1 = WorkflowTransition (mkTransId 1) (mkStateId 1) (mkStateId 2) (WorkflowAction "Duplicate") TransitionInstance
          t2 = WorkflowTransition (mkTransId 2) (mkStateId 1) (mkStateId 3) (WorkflowAction "Duplicate") TransitionInstance
          badW = validWorkflow { wTransitions = [t1, t2] }
      validateWorkflow badW `shouldBe` Left (DuplicateTransitionLogic (mkStateId 1) (WorkflowAction "Duplicate"))
