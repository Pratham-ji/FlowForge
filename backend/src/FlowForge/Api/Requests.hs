{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE OverloadedStrings #-}

module FlowForge.Api.Requests
  ( LoginRequest(..)
  , CreateWorkflowRequest(..)
  , StateDefinitionDTO(..)
  , TransitionDefinitionDTO(..)
  , ExecuteTransitionRequest(..)
  , toDomainTransitions
  , CreateOrganizationRequest(..)
  , AddMemberRequest(..)
  , ChangeRoleRequest(..)
  ) where

import GHC.Generics
import FlowForge.Api.Types
import Control.Lens
import Data.OpenApi.Lens
import Data.Aeson
import Data.OpenApi (ToSchema(..), genericDeclareNamedSchema, defaultSchemaOptions)
import qualified Data.OpenApi as OA
import Data.UUID
import qualified Data.Text
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
  , reqExpectedVersion :: Int
  } deriving (Show, Generic)

renameExecuteFields :: String -> String
renameExecuteFields "reqAction" = "action"
renameExecuteFields "reqExpectedVersion" = "expectedVersion"
renameExecuteFields other = other

instance FromJSON ExecuteTransitionRequest where
  parseJSON = genericParseJSON defaultOptions { fieldLabelModifier = renameExecuteFields }

instance ToJSON ExecuteTransitionRequest where
  toJSON = genericToJSON defaultOptions { fieldLabelModifier = renameExecuteFields }

instance ToSchema ExecuteTransitionRequest where
  declareNamedSchema = genericDeclareNamedSchema defaultSchemaOptions { OA.fieldLabelModifier = renameExecuteFields }

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

data AddMemberRequest = AddMemberRequest
  { reqUserId :: UUID
  , reqRole :: RoleDTO
  } deriving (Show, Generic)

instance FromJSON AddMemberRequest where
  parseJSON = genericParseJSON (defaultOptions { fieldLabelModifier = renameId })
    where
      renameId "reqUserId" = "userId"
      renameId "reqRole" = "role"
      renameId x = x

instance ToSchema AddMemberRequest where
  declareNamedSchema proxy = genericDeclareNamedSchema defaultSchemaOptions proxy
    & mapped.schema.properties %~
      ( \props -> props
          & at "userId" .~ (props ^. at "reqUserId")
          & at "reqUserId" .~ Nothing
          & at "role" .~ (props ^. at "reqRole")
          & at "reqRole" .~ Nothing
      )
    & mapped.schema.required %~ (\reqs -> filter (/= "reqUserId") (filter (/= "reqRole") reqs) ++ ["userId", "role"])

data ChangeRoleRequest = ChangeRoleRequest
  { reqNewRole :: RoleDTO
  } deriving (Show, Generic)

instance FromJSON ChangeRoleRequest where
  parseJSON = genericParseJSON (defaultOptions { fieldLabelModifier = renameId })
    where
      renameId "reqNewRole" = "role"
      renameId x = x

instance ToSchema ChangeRoleRequest where
  declareNamedSchema proxy = genericDeclareNamedSchema defaultSchemaOptions proxy
    & mapped.schema.properties %~
      ( \props -> props
          & at "role" .~ (props ^. at "reqNewRole")
          & at "reqNewRole" .~ Nothing
      )
    & mapped.schema.required %~ (\reqs -> filter (/= "reqNewRole") reqs ++ ["role"])

data CreateOrganizationRequest = CreateOrganizationRequest
  { orgNameReq :: Data.Text.Text
  } deriving (Show, Generic)

instance FromJSON CreateOrganizationRequest where
  parseJSON = genericParseJSON (defaultOptions { fieldLabelModifier = renameId })
    where
      renameId "orgNameReq" = "name"
      renameId x = x

instance ToSchema CreateOrganizationRequest where
  declareNamedSchema proxy = genericDeclareNamedSchema defaultSchemaOptions proxy
    & mapped.schema.properties %~
      ( \props -> props
          & at "name" .~ (props ^. at "orgNameReq")
          & at "orgNameReq" .~ Nothing
      )
    & mapped.schema.required %~ (\reqs -> filter (/= "orgNameReq") reqs ++ ["name"])
