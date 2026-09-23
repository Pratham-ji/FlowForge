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
import FlowForge.Api.Routes (WorkflowsApi, InstancesApi, RootAPI, OrganizationsApi)
import FlowForge.Api.Auth

import FlowForge.Domain.Types
import FlowForge.Application.UseCases.Auth
import FlowForge.Application.UseCases.Workflow
import FlowForge.Application.UseCases.Instance
import FlowForge.Application.UseCases.Organization
import FlowForge.Infrastructure.Database (SqlM)
import FlowForge.Infrastructure.Transaction (transactionPort)
import FlowForge.Infrastructure.Repositories.User (userRepository)
import FlowForge.Application.Ports
import FlowForge.Infrastructure.Auth.Password (passwordVerifier, hashPasswordIO)
import FlowForge.Infrastructure.Repositories.Workflow (workflowRepository)
import FlowForge.Infrastructure.Repositories.Instance (instanceRepository)
import FlowForge.Api.Env (AppEnv(..))

type AppHandler = ReaderT AppEnv Handler

server :: JWTSettings -> ServerT RootAPI AppHandler
server jwtSettings = (return "OK"
                :<|> readyHandler
                :<|> loginHandler jwtSettings
                :<|> registerHandler jwtSettings
                :<|> meHandler
                :<|> workflowsServer
                :<|> instancesServer
                :<|> organizationsServer
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
                   NotAMember _ -> "NotAMember"
                   TenantMismatch _ _ -> "TenantMismatch"
                   ConcurrencyConflict _ -> "ConcurrencyConflict"
                   PersistenceFailure _ -> "PersistenceFailure"
                   BusinessRuleViolation _ -> "BusinessRuleViolation"
      liftIO $ hPutStrLn stderr $ "[Diagnostic] Context=" ++ ctx ++ " Status=" ++ show status ++ " Code=" ++ code
      throwError (mapAppError err)
    Right val -> return val

loginHandler :: JWTSettings -> LoginRequest -> AppHandler AuthResponse
loginHandler jwtSettings req = do
  u <- runUc "authenticateUserUC" $ authenticateUserUC userRepository passwordVerifier (FlowForge.Api.Requests.email req) (FlowForge.Api.Requests.password req)
  let authUser = AuthenticatedUser
        { auUserId = let (UserId uid) = uId u in uid
        }
  tokenE <- liftIO $ do
    now <- liftIO getCurrentTime
    let expiry = Just (addUTCTime 7200 now)
    liftIO $ makeJWT authUser jwtSettings expiry
  case tokenE of
    Left _ -> throwError err500
    Right t -> return $ AuthResponse
      { token = TE.decodeUtf8 (BL.toStrict t)
      , user = UserDTO (auUserId authUser)
      }


registerHandler :: JWTSettings -> RegisterRequest -> AppHandler AuthResponse
registerHandler jwtSettings req = do
  u <- runUc "registerUserUC" $ registerUserUC userRepository (\t -> liftIO (hashPasswordIO t)) (regEmail req) (regPassword req)
  let authUser = AuthenticatedUser
        { auUserId = let (UserId uid) = uId u in uid
        }
  tokenE <- liftIO $ do
    now <- liftIO getCurrentTime
    let expiry = Just (addUTCTime 7200 now)
    liftIO $ makeJWT authUser jwtSettings expiry
  case tokenE of
    Left _ -> throwError err500
    Right t -> return $ AuthResponse
      { token = TE.decodeUtf8 (BL.toStrict t)
      , user = UserDTO (auUserId authUser)
      }

meHandler :: AuthResult AuthenticatedUser -> AppHandler UserDTO
meHandler authResult = do
  authUser <- liftEither (requireAuth authResult)
  return $ UserDTO (auUserId authUser)

requireMembership :: AuthResult AuthenticatedUser -> Maybe UUID -> AppHandler (UserId, OrganizationId, Role)
requireMembership authResult maybeOrgId = do
  authUser <- liftEither (requireAuth authResult)
  let uid = UserId (auUserId authUser)
  case maybeOrgId of
    Nothing -> throwError err400 { errBody = "Missing X-Organization-Id header" }
    Just oidUUID -> do
      let oid = OrganizationId oidUUID
      role <- runUc "getOrganizationMembership" $ getOrganizationMembership userRepository oid uid
      return (uid, oid, role)

organizationsServer :: AuthResult AuthenticatedUser -> ServerT OrganizationsApi AppHandler
organizationsServer authResult = listOrgs :<|> createOrg :<|> getOrg :<|> membersServer
  where
    membersServer oidUUID = listMembers oidUUID :<|> addMember oidUUID :<|> changeRole oidUUID :<|> removeMember oidUUID

    listOrgs = do
      authUser <- liftEither (requireAuth authResult)
      let uid = UserId (auUserId authUser)
      orgs <- runUc "listUserOrganizations" $ listUserOrganizations userRepository uid
      return $ map (\o -> OrganizationDTO (let (OrganizationId oid) = orgId o in oid) (orgName o)) orgs

    createOrg req = do
      authUser <- liftEither (requireAuth authResult)
      let uid = UserId (auUserId authUser)
      o <- runUc "createOrganization" $ createOrganization userRepository (orgNameReq req) uid
      return $ OrganizationDTO (let (OrganizationId oid) = orgId o in oid) (orgName o)

    getOrg oidUUID = do
      (uid, oid, role) <- requireMembership authResult (Just oidUUID)
      o <- runUc "getOrganizationUC" $ getOrganizationUC userRepository oid uid role
      return $ OrganizationDTO (let (OrganizationId orid) = orgId o in orid) (orgName o)

    listMembers oidUUID = do
      (uid, oid, role) <- requireMembership authResult (Just oidUUID)
      members <- runUc "listOrganizationMembers" $ listOrganizationMembers userRepository oid
      return $ map (\m -> OrganizationMemberDTO (let (UserId muid) = omUserId m in muid) (fromDomainRole (omRole m)) (omEmail m)) members

    addMember oidUUID req = do
      (uid, oid, role) <- requireMembership authResult (Just oidUUID)
      let targetRole = toDomainRole (reqRole (req :: AddMemberRequest))
      m <- runUc "addOrganizationMemberUC" $ addOrganizationMemberUC userRepository oid uid role (UserId $ reqUserId req) targetRole
      return $ OrganizationMemberDTO (let (UserId muid) = omUserId m in muid) (fromDomainRole (omRole m)) (omEmail m)

    changeRole oidUUID targetIdUUID req = do
      (uid, oid, role) <- requireMembership authResult (Just oidUUID)
      let targetRole = toDomainRole (reqNewRole (req :: ChangeRoleRequest))
      m <- runUc "updateOrganizationMemberRoleUC" $ updateOrganizationMemberRoleUC userRepository oid uid role (UserId targetIdUUID) targetRole
      return $ OrganizationMemberDTO (let (UserId muid) = omUserId m in muid) (fromDomainRole (omRole m)) (omEmail m)

    removeMember oidUUID targetIdUUID = do
      (uid, oid, role) <- requireMembership authResult (Just oidUUID)
      _ <- runUc "removeOrganizationMemberUC" $ removeOrganizationMemberUC userRepository oid uid role (UserId targetIdUUID)
      return NoContent

workflowsServer :: AuthResult AuthenticatedUser -> Maybe UUID -> ServerT WorkflowsApi AppHandler
workflowsServer authResult maybeOrgId = listWfs authResult maybeOrgId
                        :<|> createWf authResult maybeOrgId
                        :<|> getWf authResult maybeOrgId
                        :<|> activateWf authResult maybeOrgId
                        :<|> archiveWf authResult maybeOrgId
                        :<|> createInst authResult maybeOrgId
                        :<|> listInsts authResult maybeOrgId

createWf :: AuthResult AuthenticatedUser -> Maybe UUID -> CreateWorkflowRequest -> AppHandler WorkflowDTO
createWf authResult maybeOrgId req = do
  (uid, oid, role) <- requireMembership authResult maybeOrgId
  newId <- liftIO nextRandom
  trans <- liftEither $ case toDomainTransitions (FlowForge.Api.Requests.transitions req) of
             Left _ -> Left (err400 { errBody = "Invalid transition payload" })
             Right ts -> Right ts

  let statesDomain = map (\s -> WorkflowState (WorkflowStateId $ reqStateId s) (reqStateName s) (reqStateIsTerminal s)) (states req)
      wf = Workflow
            { wId = WorkflowId newId
            , wOrgId = oid
            , wName = FlowForge.Api.Requests.name (req :: CreateWorkflowRequest)
            , wLifecycle = Draft
            , wInitialStateId = WorkflowStateId (initialStateId req)
            , wStates = statesDomain
            , wTransitions = trans
            }
  _ <- runUc "createWorkflow" $ createWorkflow workflowRepository uid role wf
  return (fromDomainWorkflow wf)

getWf :: AuthResult AuthenticatedUser -> Maybe UUID -> UUID -> AppHandler WorkflowDTO
getWf authResult maybeOrgId wfId = do
  (uid, oid, role) <- requireMembership authResult maybeOrgId
  wf <- runUc "getWorkflowUC" $ getWorkflowUC workflowRepository oid uid role (WorkflowId wfId)
  return (fromDomainWorkflow wf)

activateWf :: AuthResult AuthenticatedUser -> Maybe UUID -> UUID -> AppHandler WorkflowDTO
activateWf authResult maybeOrgId wfId = do
  (uid, oid, role) <- requireMembership authResult maybeOrgId
  _ <- runUc "activateWorkflow" $ activateWorkflow workflowRepository oid uid role (WorkflowId wfId)
  getWf authResult maybeOrgId wfId

archiveWf :: AuthResult AuthenticatedUser -> Maybe UUID -> UUID -> AppHandler WorkflowDTO
archiveWf authResult maybeOrgId wfId = do
  (uid, oid, role) <- requireMembership authResult maybeOrgId
  _ <- runUc "archiveWorkflow" $ archiveWorkflow workflowRepository oid uid role (WorkflowId wfId)
  getWf authResult maybeOrgId wfId

createInst :: AuthResult AuthenticatedUser -> Maybe UUID -> UUID -> AppHandler WorkflowInstanceDTO
createInst authResult maybeOrgId wfId = do
  (uid, oid, role) <- requireMembership authResult maybeOrgId
  newId <- liftIO nextRandom
  _ <- runUc "createWorkflowInstanceUC" $ createWorkflowInstanceUC workflowRepository instanceRepository oid uid role (WorkflowId wfId) (WorkflowInstanceId newId)
  inst <- runUc "getWorkflowInstanceUC" $ getWorkflowInstanceUC instanceRepository oid uid role (WorkflowInstanceId newId)
  return (fromDomainInstance inst 1)


listWfs :: AuthResult AuthenticatedUser -> Maybe UUID -> AppHandler [WorkflowDTO]
listWfs authResult maybeOrgId = do
  (uid, oid, role) <- requireMembership authResult maybeOrgId
  wfs <- runUc "listWorkflowsUC" $ listWorkflowsUC workflowRepository oid uid role
  return (map fromDomainWorkflow wfs)

listInsts :: AuthResult AuthenticatedUser -> Maybe UUID -> UUID -> AppHandler [WorkflowInstanceDTO]
listInsts authResult maybeOrgId wfId = do
  (uid, oid, role) <- requireMembership authResult maybeOrgId
  insts <- runUc "listWorkflowInstancesUC" $ listWorkflowInstancesUC workflowRepository instanceRepository oid uid role (WorkflowId wfId)
  return (map (\(inst, v) -> fromDomainInstance inst v) insts)

instancesServer :: AuthResult AuthenticatedUser -> Maybe UUID -> ServerT InstancesApi AppHandler
instancesServer authResult maybeOrgId = getInst authResult maybeOrgId
                        :<|> transInst authResult maybeOrgId
                        :<|> auditInst authResult maybeOrgId

getInst :: AuthResult AuthenticatedUser -> Maybe UUID -> UUID -> AppHandler WorkflowInstanceDTO
getInst authResult maybeOrgId iId = do
  (uid, oid, role) <- requireMembership authResult maybeOrgId
  inst <- runUc "getWorkflowInstanceUC" $ getWorkflowInstanceUC instanceRepository oid uid role (WorkflowInstanceId iId)
  return (fromDomainInstance inst 0)

transInst :: AuthResult AuthenticatedUser -> Maybe UUID -> UUID -> ExecuteTransitionRequest -> AppHandler WorkflowInstanceDTO
transInst authResult maybeOrgId iId req = do
  (uid, oid, role) <- requireMembership authResult maybeOrgId
  env <- ask
  _ <- runUc "executeWorkflowTransitionUC" $ executeWorkflowTransitionUC transactionPort workflowRepository instanceRepository (aeAuditRepo env) oid uid role (WorkflowInstanceId iId) (WorkflowAction $ reqAction req) (reqExpectedVersion req)
  inst <- runUc "getWorkflowInstanceUC" $ getWorkflowInstanceUC instanceRepository oid uid role (WorkflowInstanceId iId)
  return (fromDomainInstance inst 0)

auditInst :: AuthResult AuthenticatedUser -> Maybe UUID -> UUID -> AppHandler [AuditEventDTO]
auditInst authResult maybeOrgId iId = do
  (uid, oid, role) <- requireMembership authResult maybeOrgId
  env <- ask
  audits <- runUc "getAuditEventsUC" $ getAuditEventsUC (aeAuditRepo env) oid uid role (WorkflowInstanceId iId)
  return (map fromDomainAudit audits)
