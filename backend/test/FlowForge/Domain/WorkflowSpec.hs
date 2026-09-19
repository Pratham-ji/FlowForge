{-# LANGUAGE OverloadedStrings #-}

module FlowForge.Domain.WorkflowSpec (spec) where

import Test.Hspec
import Data.UUID (nil)
import FlowForge.Domain.Types
import FlowForge.Domain.Error
import FlowForge.Domain.Workflow

spec :: Spec
spec = do
  describe "Workflow Lifecycle" $ do
    let baseWorkflow = Workflow 
          { wId = WorkflowId nil
          , wOrgId = OrganizationId nil
          , wName = "Test"
          , wLifecycle = Draft
          , wInitialStateId = WorkflowStateId nil
          , wStates = []
          , wTransitions = []
          }

    it "transitions Draft -> Active" $ do
      fmap wLifecycle (changeLifecycle baseWorkflow Active) `shouldBe` Right Active

    it "transitions Active -> Archived" $ do
      let activeW = baseWorkflow { wLifecycle = Active }
      fmap wLifecycle (changeLifecycle activeW Archived) `shouldBe` Right Archived

    it "rejects Draft -> Archived" $ do
      changeLifecycle baseWorkflow Archived `shouldBe` Left (InvalidLifecycleTransition Draft Archived)

    it "rejects Archived -> Active" $ do
      let archW = baseWorkflow { wLifecycle = Archived }
      changeLifecycle archW Active `shouldBe` Left (InvalidLifecycleTransition Archived Active)

  describe "Workflow Instance Creation" $ do
    let stateId = WorkflowStateId nil
    let baseWorkflow = Workflow 
          { wId = WorkflowId nil
          , wOrgId = OrganizationId nil
          , wName = "Test"
          , wLifecycle = Active
          , wInitialStateId = stateId
          , wStates = [WorkflowState stateId "Init" False]
          , wTransitions = []
          }
    let userIdForTest = UserId nil
    let instId = WorkflowInstanceId nil

    it "creates an instance from an Active workflow" $ do
      let instRes = createWorkflowInstance baseWorkflow instId userIdForTest
      fmap wiId instRes `shouldBe` Right instId
      fmap wiCurrentStateId instRes `shouldBe` Right stateId
      fmap wiCreatedBy instRes `shouldBe` Right userIdForTest

    it "fails to create instance from Draft workflow" $ do
      let draftW = baseWorkflow { wLifecycle = Draft }
      createWorkflowInstance draftW instId userIdForTest `shouldBe` Left (WorkflowNotActive Draft)

    it "fails to create instance from Archived workflow" $ do
      let archW = baseWorkflow { wLifecycle = Archived }
      createWorkflowInstance archW instId userIdForTest `shouldBe` Left (WorkflowNotActive Archived)
