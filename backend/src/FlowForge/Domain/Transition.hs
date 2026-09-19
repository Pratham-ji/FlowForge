module FlowForge.Domain.Transition (transition) where

import FlowForge.Domain.Types
import FlowForge.Domain.Error
import FlowForge.Domain.Authorization (hasPermission)
import Data.List (find)

transition
  :: Workflow
  -> WorkflowInstance
  -> UserId
  -> Role
  -> WorkflowAction
  -> Either DomainError (WorkflowInstance, AuditEvent)
transition w inst actorId role action = do
  -- 1. Verify instance belongs to workflow
  if wiWorkflowId inst /= wId w
    then Left $ WorkflowInstanceMismatch (wiWorkflowId inst) (wId w)
    else Right ()
  
  -- Verify organization match (just in case)
  if wiOrgId inst /= wOrgId w
    then Left $ OrganizationMismatch (wiOrgId inst) (wOrgId w)
    else Right ()

  -- 2. Verify workflow is active
  if wLifecycle w /= Active
    then Left $ WorkflowNotActive (wLifecycle w)
    else Right ()

  -- 3. Verify current state exists
  currState <- case find (\s -> wsId s == wiCurrentStateId inst) (wStates w) of
    Nothing -> Left $ InvalidWorkflowState (wiCurrentStateId inst)
    Just s -> Right s

  -- 4. Find matching transitions
  let possibleEdges = filter (\t -> wtSourceStateId t == wsId currState && wtAction t == action) (wTransitions w)
  
  case possibleEdges of
    [] -> 
      if wsIsTerminal currState
        then Left $ WorkflowAlreadyCompleted (wsId currState)
        else Left $ InvalidTransition (wsId currState) action
    [edge] -> do
      -- 5. Verify actor's permission
      if not (hasPermission role (wtRequiredPermission edge))
        then Left $ PermissionDenied action (wtRequiredPermission edge)
        else Right ()
      
      -- 6. Produce new instance and pure audit event
      let newInst = inst { wiCurrentStateId = wtTargetStateId edge }
          audit = AuditEvent
            { aeOrgId = wiOrgId inst
            , aeInstanceId = wiId inst
            , aeActorId = actorId
            , aePreviousStateId = wiCurrentStateId inst
            , aeAction = action
            , aeResultingStateId = wtTargetStateId edge
            }
      Right (newInst, audit)
    _ -> Left InvalidWorkflowDefinition
