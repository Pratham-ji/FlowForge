{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE OverloadedStrings #-}

module FlowForge.Api.Requests
  ( LoginRequest(..)
  , CreateWorkflowRequest(..)
  , StateDefinitionDTO(..)
  , TransitionDefinitionDTO(..)
  , ExecuteTransitionRequest(..)
  , toDomainTransitions
  ) where

import GHC.Generics
import Data.Aeson
import Data.OpenApi (ToSchema)
import Data.UUID (UUID)
import Data.Text (Text)

import FlowForge.Domain.Types (WorkflowStateId(..), TransitionId(..), WorkflowAction(..), Permission(..), WorkflowTransition(..))

parsePermission :: Text -> Maybe Permission
parsePermission "ManageOrganization" = Just ManageOrganization
parsePermission "CreateWorkflow" = Just CreateWorkflow
parsePermission "ReadWorkflow" = Just ReadWorkflow
parsePermission "UpdateWorkflow" = Just UpdateWorkflow
parsePermission "DeleteWorkflow" = Just DeleteWorkflow
parsePermission "CreateInstance" = Just CreateInstance
parsePermission "ReadInstance" = Just ReadInstance
parsePermission "TransitionInstance" = Just TransitionInstance
parsePermission "ReadAudit" = Just ReadAudit
parsePermission _ = Nothing

data LoginRequest = LoginRequest
  { email :: Text
  , password :: Text
  } deriving (Show, Generic)
instance FromJSON LoginRequest
instance ToJSON LoginRequest
instance ToSchema LoginRequest

customOptions :: Options
customOptions = defaultOptions { fieldLabelModifier = renameId }
  where
    renameId "reqStateId" = "id"
    renameId "reqStateName" = "name"
    renameId "reqStateIsTerminal" = "isTerminal"
    renameId "reqTransitionId" = "id"
    renameId "reqTransSourceStateId" = "sourceStateId"
    renameId "reqTransTargetStateId" = "targetStateId"
    renameId "reqTransAction" = "action"
    renameId "reqTransReqPerm" = "requiredPermission"
    renameId other = other

data StateDefinitionDTO = StateDefinitionDTO
  { reqStateId :: UUID
  , reqStateName :: Text
  , reqStateIsTerminal :: Bool
  } deriving (Show, Generic)
instance FromJSON StateDefinitionDTO where parseJSON = genericParseJSON customOptions
instance ToJSON StateDefinitionDTO where toJSON = genericToJSON customOptions
instance ToSchema StateDefinitionDTO

data TransitionDefinitionDTO = TransitionDefinitionDTO
  { reqTransitionId :: UUID
  , reqTransSourceStateId :: UUID
  , reqTransTargetStateId :: UUID
  , reqTransAction :: Text
  , reqTransReqPerm :: Text
  } deriving (Show, Generic)
instance FromJSON TransitionDefinitionDTO where parseJSON = genericParseJSON customOptions
instance ToJSON TransitionDefinitionDTO where toJSON = genericToJSON customOptions
instance ToSchema TransitionDefinitionDTO

data CreateWorkflowRequest = CreateWorkflowRequest
  { name :: Text
  , initialStateId :: UUID
  , states :: [StateDefinitionDTO]
  , transitions :: [TransitionDefinitionDTO]
  } deriving (Show, Generic)
instance FromJSON CreateWorkflowRequest
instance ToJSON CreateWorkflowRequest
instance ToSchema CreateWorkflowRequest

data ExecuteTransitionRequest = ExecuteTransitionRequest
  { reqAction :: Text
  } deriving (Show, Generic)
instance FromJSON ExecuteTransitionRequest where
  parseJSON = genericParseJSON defaultOptions { fieldLabelModifier = renameAction }
    where renameAction "reqAction" = "action"; renameAction other = other
instance ToSchema ExecuteTransitionRequest
instance ToJSON ExecuteTransitionRequest where
  toJSON = genericToJSON defaultOptions { fieldLabelModifier = renameAction }
    where renameAction "reqAction" = "action"; renameAction other = other

toDomainTransitions :: [TransitionDefinitionDTO] -> Either String [WorkflowTransition]
toDomainTransitions dtos = mapM convert dtos
  where
    convert dto = do
      perm <- case parsePermission (reqTransReqPerm dto) of
                Just p -> Right p
                Nothing -> Left ("Invalid permission: " ++ show (reqTransReqPerm dto))
      return $ WorkflowTransition
        { wtId = TransitionId (reqTransitionId dto)
        , wtSourceStateId = WorkflowStateId (reqTransSourceStateId dto)
        , wtTargetStateId = WorkflowStateId (reqTransTargetStateId dto)
        , wtAction = WorkflowAction (reqTransAction dto)
        , wtRequiredPermission = perm
        }
