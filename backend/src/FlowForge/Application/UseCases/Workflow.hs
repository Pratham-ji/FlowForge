module FlowForge.Application.UseCases.Workflow 
  ( createWorkflow
  , activateWorkflow
  , archiveWorkflow
  , getWorkflowUC
  ) where

import FlowForge.Domain.Types
import FlowForge.Domain.Validation (validateWorkflow)
import FlowForge.Domain.Workflow (changeLifecycle)
import FlowForge.Domain.Authorization (hasPermission)
import FlowForge.Application.Error
import FlowForge.Application.Ports
import Control.Monad.Except (ExceptT(..), runExceptT)
import qualified FlowForge.Domain.Error

-- Helper to check permissions
checkPerm :: Monad m => Role -> Permission -> UserId -> ExceptT AppError m ()
checkPerm role perm uId = 
  if hasPermission role perm
    then return ()
    else throwE (Unauthorized uId)
  where
    throwE = ExceptT . return . Left

-- Helper to run domain logic
runDomain :: Monad m => Either FlowForge.Domain.Error.DomainError a -> ExceptT AppError m a
runDomain (Left err) = ExceptT . return . Left $ DomainFailure err
runDomain (Right val) = return val

createWorkflow 
  :: Monad m 
  => WorkflowRepository m 
  -> UserId 
  -> Role 
  -> Workflow 
  -> m (Either AppError ())
createWorkflow repo uId role w = runExceptT $ do
  checkPerm role CreateWorkflow uId
  runDomain $ validateWorkflow w
  ExceptT $ saveWorkflow repo w

activateWorkflow 
  :: Monad m 
  => WorkflowRepository m 
  -> OrganizationId 
  -> UserId 
  -> Role 
  -> WorkflowId 
  -> m (Either AppError ())
activateWorkflow repo orgId uId role wfId = runExceptT $ do
  checkPerm role UpdateWorkflow uId
  w <- ExceptT $ getWorkflow repo orgId wfId
  w' <- runDomain $ changeLifecycle w Active
  ExceptT $ saveWorkflow repo w'

archiveWorkflow 
  :: Monad m 
  => WorkflowRepository m 
  -> OrganizationId 
  -> UserId 
  -> Role 
  -> WorkflowId 
  -> m (Either AppError ())
archiveWorkflow repo orgId uId role wfId = runExceptT $ do
  checkPerm role UpdateWorkflow uId
  w <- ExceptT $ getWorkflow repo orgId wfId
  w' <- runDomain $ changeLifecycle w Archived
  ExceptT $ saveWorkflow repo w'

getWorkflowUC 
  :: Monad m 
  => WorkflowRepository m 
  -> OrganizationId 
  -> UserId 
  -> Role 
  -> WorkflowId 
  -> m (Either AppError Workflow)
getWorkflowUC repo orgId uId role wfId = runExceptT $ do
  checkPerm role ReadWorkflow uId
  ExceptT $ getWorkflow repo orgId wfId
