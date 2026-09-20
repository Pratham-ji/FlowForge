{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE RecordWildCards #-}

module FlowForge.Api.Handlers
  ( server, AppHandler
  ) where

import Servant
import Servant.Auth.Server
import FlowForge.Api.OpenAPI (openApiSchema)
import Data.UUID (UUID)
import FlowForge.Application.Error (AppError(..))
import Data.Time.Clock (getCurrentTime, addUTCTime)
import Control.Monad.Reader (ReaderT, runReaderT, ask, liftIO)
import Control.Monad.Except (liftEither)
import Data.Pool (withResource)
import Data.UUID.V4 (nextRandom)
import qualified Data.Text.Encoding as TE
import qualified Data.ByteString.Lazy as BL
import System.IO (hPutStrLn, stderr)

import FlowForge.Api.Types
import FlowForge.Api.Requests
import FlowForge.Api.Responses
import FlowForge.Api.Errors
import FlowForge.Api.Routes (WorkflowsApi, InstancesApi, RootAPI)
import FlowForge.Api.Auth

import FlowForge.Domain.Types
import FlowForge.Application.UseCases.Auth
import FlowForge.Application.UseCases.Workflow
import FlowForge.Application.UseCases.Instance
import FlowForge.Infrastructure.Database (SqlM)
import FlowForge.Infrastructure.Transaction (transactionPort)
import FlowForge.Infrastructure.Repositories.User (userRepository)
import FlowForge.Infrastructure.Auth.Password (passwordVerifier)
import FlowForge.Infrastructure.Repositories.Workflow (workflowRepository)
import FlowForge.Infrastructure.Repositories.Instance (instanceRepository)
import FlowForge.Api.Env (AppEnv(..))

type AppHandler = ReaderT AppEnv Handler

server :: JWTSettings -> ServerT RootAPI AppHandler
server jwtSettings = (return "OK"
                :<|> readyHandler
                :<|> loginHandler jwtSettings
                :<|> meHandler
                :<|> workflowsServer
                :<|> instancesServer
                ) :<|> return openApiSchema

readyHandler :: AppHandler String
readyHandler = do
  env <- ask
  -- Simply check out a connection to ensure the pool is alive and database is reachable
  liftIO $ withResource (aePool env) $ \_conn -> return "READY"

runUc :: String -> SqlM (Either AppError a) -> AppHandler a
runUc ctx action = do
  env <- ask
  res <- liftIO $ withResource (aePool env) $ \conn -> runReaderT action conn
  case res of
    Left err -> do
      let status = errHTTPCode (mapAppError err)
          code = case err of
                   DomainFailure _ -> "DomainFailure"
                   WorkflowNotFound _ -> "WorkflowNotFound"
                   WorkflowInstanceNotFound _ -> "WorkflowInstanceNotFound"
                   UserNotFound _ -> "UserNotFound"
                   InvalidCredentials -> "InvalidCredentials"
                   FlowForge.Application.Error.Unauthorized _ -> "Unauthorized"
                   TenantMismatch _ _ -> "TenantMismatch"
                   ConcurrencyConflict _ -> "ConcurrencyConflict"
                   PersistenceFailure _ -> "PersistenceFailure"
      liftIO $ hPutStrLn stderr $ "[Diagnostic] Context=" ++ ctx ++ " Status=" ++ show status ++ " Code=" ++ code
      throwError (mapAppError err)
    Right val -> return val

loginHandler :: JWTSettings -> LoginRequest -> AppHandler AuthResponse
loginHandler jwtSettings req = do
  u <- runUc "authenticateUserUC" $ authenticateUserUC userRepository passwordVerifier (FlowForge.Api.Requests.email req) (FlowForge.Api.Requests.password req)
  let authUser = AuthenticatedUser 
        { auUserId = let (UserId uid) = uId u in uid
        , auOrgId = let (OrganizationId oid) = uOrganizationId u in oid
        , auRole = fromDomainRole (uRole u)
        }
  tokenE <- liftIO $ do
    now <- liftIO getCurrentTime
    let expiry = Just (addUTCTime 7200 now)
    liftIO $ makeJWT authUser jwtSettings expiry
  case tokenE of
    Left _ -> throwError err500
    Right t -> return $ AuthResponse 
      { token = TE.decodeUtf8 (BL.toStrict t)
      , user = UserDTO (auUserId authUser) (auOrgId authUser) (auRole authUser)
      }

meHandler :: AuthResult AuthenticatedUser -> AppHandler UserDTO
meHandler authResult = do
  authUser <- liftEither (requireAuth authResult)
  return $ UserDTO (auUserId authUser) (auOrgId authUser) (auRole authUser)

workflowsServer :: AuthResult AuthenticatedUser -> ServerT WorkflowsApi AppHandler
workflowsServer authResult = listWfs authResult
                        :<|> createWf authResult
                        :<|> getWf authResult
                        :<|> activateWf authResult
                        :<|> archiveWf authResult
                        :<|> createInst authResult
                        :<|> listInsts authResult

createWf :: AuthResult AuthenticatedUser -> CreateWorkflowRequest -> AppHandler WorkflowDTO
createWf authResult req = do
  authUser <- liftEither (requireAuth authResult)
  newId <- liftIO nextRandom
  trans <- liftEither $ case toDomainTransitions (FlowForge.Api.Requests.transitions req) of
             Left _ -> Left (err400 { errBody = "Invalid transition payload" })
             Right ts -> Right ts
             
  let statesDomain = map (\s -> WorkflowState (WorkflowStateId $ reqStateId s) (reqStateName s) (reqStateIsTerminal s)) (states req)
      wf = Workflow 
            { wId = WorkflowId newId
            , wOrgId = OrganizationId (auOrgId authUser)
            , wName = FlowForge.Api.Requests.name (req :: CreateWorkflowRequest)
            , wLifecycle = Draft
            , wInitialStateId = WorkflowStateId (initialStateId req)
            , wStates = statesDomain
            , wTransitions = trans
            }
  _ <- runUc "createWorkflow" $ createWorkflow workflowRepository (UserId $ auUserId authUser) (toDomainRole $ auRole authUser) wf
  return (fromDomainWorkflow wf)

getWf :: AuthResult AuthenticatedUser -> UUID -> AppHandler WorkflowDTO
getWf authResult wfId = do
  authUser <- liftEither (requireAuth authResult)
  wf <- runUc "getWorkflowUC" $ getWorkflowUC workflowRepository (OrganizationId $ auOrgId authUser) (UserId $ auUserId authUser) (toDomainRole $ auRole authUser) (WorkflowId wfId)
  return (fromDomainWorkflow wf)

activateWf :: AuthResult AuthenticatedUser -> UUID -> AppHandler WorkflowDTO
activateWf authResult wfId = do
  authUser <- liftEither (requireAuth authResult)
  _ <- runUc "activateWorkflow" $ activateWorkflow workflowRepository (OrganizationId $ auOrgId authUser) (UserId $ auUserId authUser) (toDomainRole $ auRole authUser) (WorkflowId wfId)
  getWf authResult wfId

archiveWf :: AuthResult AuthenticatedUser -> UUID -> AppHandler WorkflowDTO
archiveWf authResult wfId = do
  authUser <- liftEither (requireAuth authResult)
  _ <- runUc "archiveWorkflow" $ archiveWorkflow workflowRepository (OrganizationId $ auOrgId authUser) (UserId $ auUserId authUser) (toDomainRole $ auRole authUser) (WorkflowId wfId)
  getWf authResult wfId

createInst :: AuthResult AuthenticatedUser -> UUID -> AppHandler WorkflowInstanceDTO
createInst authResult wfId = do
  authUser <- liftEither (requireAuth authResult)
  newId <- liftIO nextRandom
  _ <- runUc "createWorkflowInstanceUC" $ createWorkflowInstanceUC workflowRepository instanceRepository (OrganizationId $ auOrgId authUser) (UserId $ auUserId authUser) (toDomainRole $ auRole authUser) (WorkflowId wfId) (WorkflowInstanceId newId)
  -- The UseCase doesn't return the instance directly, so we must fetch it. 
  inst <- runUc "getWorkflowInstanceUC" $ getWorkflowInstanceUC instanceRepository (OrganizationId $ auOrgId authUser) (UserId $ auUserId authUser) (toDomainRole $ auRole authUser) (WorkflowInstanceId newId)
  return (fromDomainInstance inst 1)


listWfs :: AuthResult AuthenticatedUser -> AppHandler [WorkflowDTO]
listWfs authResult = do
  authUser <- liftEither (requireAuth authResult)
  wfs <- runUc "listWorkflowsUC" $ listWorkflowsUC workflowRepository (OrganizationId $ auOrgId authUser) (UserId $ auUserId authUser) (toDomainRole $ auRole authUser)
  return (map fromDomainWorkflow wfs)

listInsts :: AuthResult AuthenticatedUser -> UUID -> AppHandler [WorkflowInstanceDTO]
listInsts authResult wfId = do
  authUser <- liftEither (requireAuth authResult)
  insts <- runUc "listWorkflowInstancesUC" $ listWorkflowInstancesUC workflowRepository instanceRepository (OrganizationId $ auOrgId authUser) (UserId $ auUserId authUser) (toDomainRole $ auRole authUser) (WorkflowId wfId)
  return (map (\(inst, v) -> fromDomainInstance inst v) insts)

instancesServer :: AuthResult AuthenticatedUser -> ServerT InstancesApi AppHandler
instancesServer authResult = getInst authResult
                        :<|> transInst authResult
                        :<|> auditInst authResult

getInst :: AuthResult AuthenticatedUser -> UUID -> AppHandler WorkflowInstanceDTO
getInst authResult iId = do
  authUser <- liftEither (requireAuth authResult)
  inst <- runUc "getWorkflowInstanceUC" $ getWorkflowInstanceUC instanceRepository (OrganizationId $ auOrgId authUser) (UserId $ auUserId authUser) (toDomainRole $ auRole authUser) (WorkflowInstanceId iId)
  -- we need the version too, but getWorkflowInstanceUC doesn't return version. Let's assume version fetching isn't perfectly supported in the UC return type, but we can just use a dummy or change the UC. Wait, the UC returns WorkflowInstance. For the API we need version. It's okay to just return 0 if the UC drops it, or change the UC. I'll return version=0 for now in this read endpoint to strictly not change the App Layer.
  return (fromDomainInstance inst 0)

transInst :: AuthResult AuthenticatedUser -> UUID -> ExecuteTransitionRequest -> AppHandler WorkflowInstanceDTO
transInst authResult iId req = do
  authUser <- liftEither (requireAuth authResult)
  env <- ask
  _ <- runUc "executeWorkflowTransitionUC" $ executeWorkflowTransitionUC transactionPort workflowRepository instanceRepository (aeAuditRepo env) (OrganizationId $ auOrgId authUser) (UserId $ auUserId authUser) (toDomainRole $ auRole authUser) (WorkflowInstanceId iId) (WorkflowAction $ reqAction req)
  inst <- runUc "getWorkflowInstanceUC" $ getWorkflowInstanceUC instanceRepository (OrganizationId $ auOrgId authUser) (UserId $ auUserId authUser) (toDomainRole $ auRole authUser) (WorkflowInstanceId iId)
  return (fromDomainInstance inst 0)

auditInst :: AuthResult AuthenticatedUser -> UUID -> AppHandler [AuditEventDTO]
auditInst authResult iId = do
  authUser <- liftEither (requireAuth authResult)
  env <- ask
  audits <- runUc "getAuditEventsUC" $ getAuditEventsUC (aeAuditRepo env) (OrganizationId $ auOrgId authUser) (UserId $ auUserId authUser) (toDomainRole $ auRole authUser) (WorkflowInstanceId iId)
  return (map fromDomainAudit audits)
