module FlowForge.Application.Error (AppError(..)) where

import FlowForge.Domain.Error
import FlowForge.Domain.Types (OrganizationId, WorkflowId, WorkflowInstanceId, UserId)

data AppError
  = DomainFailure DomainError
  | WorkflowNotFound WorkflowId
  | WorkflowInstanceNotFound WorkflowInstanceId
  | UserNotFound String
  | NotAMember String
  | InvalidCredentials
  | Unauthorized UserId
  | TenantMismatch OrganizationId OrganizationId
  | ConcurrencyConflict WorkflowInstanceId
  | PersistenceFailure String
  | BusinessRuleViolation String
  deriving (Eq, Show)
