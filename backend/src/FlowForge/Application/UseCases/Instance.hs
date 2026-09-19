module FlowForge.Application.UseCases.Instance
  ( createWorkflowInstanceUC
  , executeWorkflowTransitionUC
  , getWorkflowInstanceUC
  , getAuditEventsUC
  ) where

import FlowForge.Domain.Types
import FlowForge.Domain.Workflow (createWorkflowInstance)
import FlowForge.Domain.Transition (transition)
import FlowForge.Domain.Authorization (hasPermission)
import FlowForge.Application.Error
import FlowForge.Application.Ports
import Control.Monad.Except (ExceptT(..), runExceptT)
import qualified FlowForge.Domain.Error as DomainError

checkPerm :: Monad m => Role -> Permission -> UserId -> ExceptT AppError m ()
checkPerm role perm userId =
  if hasPermission role perm
    then return ()
    else throwE (Unauthorized userId)
  where
    throwE = ExceptT . return . Left

runDomain :: Monad m => Either DomainError.DomainError a -> ExceptT AppError m a
runDomain (Left err) = ExceptT . return . Left $ DomainFailure err
runDomain (Right val) = return val

createWorkflowInstanceUC
  :: Monad m
  => WorkflowRepository m
  -> InstanceRepository m
  -> OrganizationId
  -> UserId
  -> Role
  -> WorkflowId
  -> WorkflowInstanceId
  -> m (Either AppError WorkflowInstance)
createWorkflowInstanceUC wRepo iRepo orgId userId role wfId instId = runExceptT $ do
  checkPerm role CreateInstance userId
  w <- ExceptT $ getWorkflow wRepo orgId wfId
  inst <- runDomain $ createWorkflowInstance w instId userId
  -- version 1
  ExceptT $ saveWorkflowInstance iRepo inst 1
  return inst

executeWorkflowTransitionUC
  :: Monad m
  => TransactionPort m
  -> WorkflowRepository m
  -> InstanceRepository m
  -> AuditRepository m
  -> OrganizationId
  -> UserId
  -> Role
  -> WorkflowInstanceId
  -> WorkflowAction
  -> m (Either AppError ())
executeWorkflowTransitionUC txPort wRepo iRepo aRepo orgId userId role instId action = runExceptT $ do
  -- Authorize overall read access (Transition function also checks specific edge permissions)
  checkPerm role TransitionInstance userId

  -- We wrap the entire process in a transaction
  -- withExceptT trick isn't easily doable across the transaction boundary without running ExceptT inside,
  -- but our Ports are returning Either AppError directly.
  ExceptT $ withTransaction txPort $ runExceptT $ do
    (inst, version) <- ExceptT $ getWorkflowInstance iRepo orgId instId
    w <- ExceptT $ getWorkflow wRepo orgId (wiWorkflowId inst)

    (newInst, audit) <- runDomain $ transition w inst userId role action

    ExceptT $ saveWorkflowInstance iRepo newInst (version + 1)
    ExceptT $ appendAuditEvent aRepo audit

getWorkflowInstanceUC
  :: Monad m
  => InstanceRepository m
  -> OrganizationId
  -> UserId
  -> Role
  -> WorkflowInstanceId
  -> m (Either AppError WorkflowInstance)
getWorkflowInstanceUC iRepo orgId userId role instId = runExceptT $ do
  checkPerm role ReadInstance userId
  (inst, _) <- ExceptT $ getWorkflowInstance iRepo orgId instId
  return inst

getAuditEventsUC
  :: Monad m
  => AuditRepository m
  -> OrganizationId
  -> UserId
  -> Role
  -> WorkflowInstanceId
  -> m (Either AppError [AuditEvent])
getAuditEventsUC aRepo orgId userId role instId = runExceptT $ do
  checkPerm role ReadAudit userId
  ExceptT $ getAuditEvents aRepo orgId instId
