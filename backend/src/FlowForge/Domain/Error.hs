module FlowForge.Domain.Error (DomainError(..)) where

import FlowForge.Domain.Types

data DomainError
  = InvalidTransition WorkflowStateId WorkflowAction
  | PermissionDenied WorkflowAction Permission
  | InvalidWorkflowState WorkflowStateId
  | WorkflowAlreadyCompleted WorkflowStateId
  | WorkflowNotActive WorkflowLifecycle
  | InvalidInitialState WorkflowStateId
  | DuplicateState WorkflowStateId
  | DuplicateStateName
  | DuplicateTransition TransitionId
  | DuplicateTransitionLogic WorkflowStateId WorkflowAction
  | DanglingTransitionSource TransitionId WorkflowStateId
  | DanglingTransitionTarget TransitionId WorkflowStateId
  | InvalidLifecycleTransition WorkflowLifecycle WorkflowLifecycle
  | OrganizationMismatch OrganizationId OrganizationId
  | InvalidWorkflowDefinition
  | WorkflowInstanceMismatch WorkflowId WorkflowId
  deriving (Eq, Show)
