module FlowForge.Domain.AuthorizationSpec (spec) where

import Test.Hspec
import FlowForge.Domain.Types
import FlowForge.Domain.Authorization

spec :: Spec
spec = do
  describe "Authorization" $ do
    it "Admin has all permissions" $ do
      let allPerms = [minBound .. maxBound] :: [Permission]
      all (\p -> hasPermission Admin p) allPerms `shouldBe` True

    it "Viewer only has read permissions" $ do
      hasPermission Viewer ReadWorkflow `shouldBe` True
      hasPermission Viewer ReadInstance `shouldBe` True
      hasPermission Viewer ReadAudit `shouldBe` True
      hasPermission Viewer CreateWorkflow `shouldBe` False
      hasPermission Viewer TransitionInstance `shouldBe` False

    it "Manager cannot manage organization" $ do
      hasPermission Manager ManageOrganization `shouldBe` False
      hasPermission Manager CreateWorkflow `shouldBe` True

    it "Member can transition instances but not create workflows" $ do
      hasPermission Member TransitionInstance `shouldBe` True
      hasPermission Member CreateWorkflow `shouldBe` False
