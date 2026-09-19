{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE RecordWildCards #-}
{-# LANGUAGE DeriveGeneric #-}

module FlowForge.Api.Errors
  ( mapAppError
  , ApiErrorWrapper(..)
  , ApiError(..)
  ) where

import GHC.Generics
import Data.Aeson
import Servant.Server (ServerError(..), err401, err403, err404, err409, err422, err500)
import Data.Text (Text)
import FlowForge.Application.Error
import FlowForge.Domain.Error

data ApiError = ApiError
  { code :: Text
  , message :: Text
  } deriving (Show, Generic)
instance ToJSON ApiError

data ApiErrorWrapper = ApiErrorWrapper
  { error :: ApiError
  } deriving (Show, Generic)
instance ToJSON ApiErrorWrapper

mapAppError :: AppError -> ServerError
mapAppError e = case e of
  InvalidCredentials -> 
    jsonError err401 "UNAUTHORIZED" "Invalid credentials."
  UserNotFound _ -> 
    jsonError err401 "UNAUTHORIZED" "Invalid credentials."
  Unauthorized _ -> 
    jsonError err403 "FORBIDDEN" "You do not have permission to perform this action."
  WorkflowNotFound _ -> 
    jsonError err404 "NOT_FOUND" "The requested workflow was not found."
  WorkflowInstanceNotFound _ -> 
    jsonError err404 "NOT_FOUND" "The requested workflow instance was not found."
  TenantMismatch _ _ -> 
    jsonError err404 "NOT_FOUND" "The requested resource was not found."
  ConcurrencyConflict _ -> 
    jsonError err409 "CONCURRENCY_CONFLICT" "The workflow instance was modified by another request."
  DomainFailure df -> mapDomainError df
  PersistenceFailure _ -> 
    jsonError err500 "INTERNAL_ERROR" "An unexpected infrastructure error occurred."

mapDomainError :: DomainError -> ServerError
mapDomainError de = case de of
  InvalidTransition _ _ -> 
    jsonError err422 "INVALID_TRANSITION" "The transition is invalid for the current state."
  InvalidWorkflowDefinition -> 
    jsonError err422 "INVALID_WORKFLOW" "The workflow definition is invalid."
  WorkflowNotActive _ -> 
    jsonError err409 "LIFECYCLE_CONFLICT" "The workflow is not active."
  OrganizationMismatch _ _ -> 
    jsonError err404 "NOT_FOUND" "Resource not found."
  WorkflowInstanceMismatch _ _ -> 
    jsonError err422 "INSTANCE_MISMATCH" "The instance does not belong to this workflow."
  PermissionDenied _ _ -> 
    jsonError err403 "FORBIDDEN" "Insufficient permission to execute this domain action."
  _ -> 
    jsonError err422 "DOMAIN_ERROR" "A domain validation rule was violated."

jsonError :: ServerError -> Text -> Text -> ServerError
jsonError baseErr c m = baseErr 
  { errBody = encode $ ApiErrorWrapper (ApiError c m)
  , errHeaders = [("Content-Type", "application/json")]
  }
