module FlowForge.Domain.Workflow 
  ( createWorkflowInstance
  , changeLifecycle
  ) where

import FlowForge.Domain.Types
import FlowForge.Domain.Error

createWorkflowInstance
  :: Workflow
  -> WorkflowInstanceId
  -> UserId
  -> Either DomainError WorkflowInstance
createWorkflowInstance w instId actorId = do
  -- Must be active
  if wLifecycle w /= Active
    then Left $ WorkflowNotActive (wLifecycle w)
    else Right ()
  
  -- Create the instance
  Right WorkflowInstance
    { wiId = instId
    , wiWorkflowId = wId w
    , wiOrgId = wOrgId w
    , wiCurrentStateId = wInitialStateId w
    , wiCreatedBy = actorId
    }

changeLifecycle
  :: Workflow
  -> WorkflowLifecycle
  -> Either DomainError Workflow
changeLifecycle w target = do
  case (wLifecycle w, target) of
    (Draft, Active) -> Right w { wLifecycle = Active }
    (Active, Archived) -> Right w { wLifecycle = Archived }
    (curr, tgt) -> Left $ InvalidLifecycleTransition curr tgt
