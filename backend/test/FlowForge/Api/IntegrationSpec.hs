{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE QuasiQuotes #-}
{-# LANGUAGE ScopedTypeVariables #-}

module FlowForge.Api.IntegrationSpec (spec) where

import Test.Hspec
import Test.Hspec.Wai

import Servant.Auth.Server
import qualified Data.ByteString.Char8 as B
import qualified Data.ByteString.Lazy as BL
import Data.Aeson (encode, object, (.=), decode, Value(..))
import Data.Word (Word32)
import Data.Pool (withResource)
import Data.String (fromString)
import Data.Time.Clock (getCurrentTime, addUTCTime)
import qualified Data.Text.Encoding as TE

import Network.Wai (Application)
import Network.HTTP.Types.Status (statusCode)
import Data.CaseInsensitive (mk)
import Network.HTTP.Types.Header (Header)
import FlowForge.Api.Server (appWith)
import FlowForge.Config (AppConfig(..), Environment(..))
import FlowForge.Infrastructure.Database (initDbPool, DbPool, SqlM)
import Database.PostgreSQL.Simple (Connection, execute_, execute, Only(..))
import Data.UUID (UUID, fromWords)
import FlowForge.Application.Ports
import FlowForge.Application.Error
import FlowForge.Infrastructure.Auth.Password (hashPasswordIO)
import FlowForge.Infrastructure.Repositories.Audit (auditRepository)
import FlowForge.Api.Types
import FlowForge.Api.Responses

mkId :: Word32 -> UUID
mkId w = fromWords 0 0 0 w

setupDb :: Connection -> IO ()
setupDb conn = do
  _ <- execute_ conn "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
  schemaSql <- B.readFile "migrations/001_initial_schema.sql"
  authSql <- B.readFile "migrations/002_authentication.sql"
  _ <- execute_ conn (fromString $ B.unpack schemaSql)
  _ <- execute_ conn (fromString $ B.unpack authSql)
  _ <- execute conn "INSERT INTO organizations (id) VALUES (?)" (Only (mkId 1))
  _ <- execute conn "INSERT INTO organizations (id) VALUES (?)" (Only (mkId 2))
  hash <- hashPasswordIO "password"
  _ <- execute conn "INSERT INTO users (id, organization_id, role, email, password_hash) VALUES (?, ?, 'Admin', 'admin@example.com', ?)" (mkId 100, mkId 1, hash)
  _ <- execute conn "INSERT INTO users (id, organization_id, role, email, password_hash) VALUES (?, ?, 'Viewer', 'viewer@example.com', ?)" (mkId 101, mkId 1, hash)
  _ <- execute conn "INSERT INTO users (id, organization_id, role, email, password_hash) VALUES (?, ?, 'Admin', 'adminb@example.com', ?)" (mkId 200, mkId 2, hash)
  return ()

failingAuditRepo :: AuditRepository SqlM
failingAuditRepo = auditRepository
  { appendAuditEvent = \_ -> return (Left (PersistenceFailure "Mock DB Failure"))
  }

getApps :: IO (Application, Application, DbPool, JWTSettings)
getApps = do
  pool <- initDbPool "host=localhost dbname=flowforge_test user=postgres password=postgres port=5432"
  withResource pool setupDb
  key <- generateKey
  let jwtSettings = defaultJWTSettings key
  let testConfig = AppConfig "" 8080 Development Nothing
  let appNormal = appWith pool jwtSettings auditRepository
  let appFailing = appWith pool jwtSettings failingAuditRepo
  return (appNormal, appFailing, pool, jwtSettings)

authHeader :: String -> String -> WaiSession st [Header]
authHeader email pass = do
  let loginReq = object ["email" .= email, "password" .= pass]
  res <- request "POST" "/api/v1/auth/login" [(mk "Content-Type", "application/json")] (encode loginReq)
  case decode (simpleBody res) :: Maybe AuthResponse of
     Just auth -> do
       let t = token auth
       return [(mk "Authorization", B.append "Bearer " (TE.encodeUtf8 t))]
     Nothing -> return []


requireJust :: String -> Maybe a -> IO a
requireJust msg Nothing = expectationFailure msg >> error "unreachable"
requireJust _ (Just x) = pure x

spec :: Spec
spec = do
  (appNormal, appFailing, _pool, jwtSettings) <- runIO getApps

  with (return appNormal) $ do
    describe "Authentication Matrix" $ do
      it "missing token -> 401" $ do
        get "/api/v1/me" `shouldRespondWith` 401

      it "malformed token -> 401" $ do
        request "GET" "/api/v1/me" [(mk "Authorization", "Bearer invalid.token.xyz")] "" `shouldRespondWith` 401

      it "invalid signature -> 401" $ do
        request "GET" "/api/v1/me" [(mk "Authorization", "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.invalid")] "" `shouldRespondWith` 401

      it "expired token -> 401" $ do
        -- Generate expired token
        let testUser = AuthenticatedUser (mkId 100) (mkId 1) AdminDTO
        now <- liftIO getCurrentTime
        let expiredTime = addUTCTime (-7200) now
        expiredTokenE <- liftIO $ makeJWT testUser jwtSettings (Just expiredTime)
        case expiredTokenE of
          Left _ -> error "failed to make expired token"
          Right t -> do
            request "GET" "/api/v1/me" [(mk "Authorization", B.append "Bearer " (BL.toStrict t))] "" `shouldRespondWith` 401

      it "valid login -> 200" $ do
        let loginReq = object ["email" .= ("admin@example.com"::String), "password" .= ("password"::String)]
        res <- request "POST" "/api/v1/auth/login" [(mk "Content-Type", "application/json")] (encode loginReq)
        liftIO $ statusCode (simpleStatus res) `shouldBe` 200
        _ <- liftIO $ requireJust "Expected AuthResponse" (decode (simpleBody res) :: Maybe AuthResponse)
        return ()

      it "invalid credentials -> 401" $ do
        let loginReq = object ["email" .= ("admin@example.com"::String), "password" .= ("wrong"::String)]
        request "POST" "/api/v1/auth/login" [(mk "Content-Type", "application/json")] (encode loginReq) `shouldRespondWith` 401

      it "valid token accessing protected endpoint -> 200" $ do
        headers <- authHeader "admin@example.com" "password"
        res <- request "GET" "/api/v1/me" headers ""
        liftIO $ statusCode (simpleStatus res) `shouldBe` 200

    describe "Authorization" $ do
      it "Viewer cannot create workflow" $ do
        headers <- authHeader "viewer@example.com" "password"
        let wfReq = object ["name" .= ("Test"::String), "initialStateId" .= mkId 10, "states" .= ([]::[Value]), "transitions" .= ([]::[Value])]
        request "POST" "/api/v1/workflows" ((mk "Content-Type", "application/json") : headers) (encode wfReq) `shouldRespondWith` 403

      it "Admin can create workflow" $ do
        headers <- authHeader "admin@example.com" "password"
        let wfReq = object [
              "name" .= ("Test Wf"::String),
              "initialStateId" .= mkId 10,
              "states" .= [
                object ["id" .= mkId 10, "name" .= ("State 1"::String), "isTerminal" .= False]
              ],
              "transitions" .= ([]::[Value])
              ]
        res <- request "POST" "/api/v1/workflows" ((mk "Content-Type", "application/json") : headers) (encode wfReq)
        liftIO $ statusCode (simpleStatus res) `shouldBe` 201

    describe "Tenant Isolation" $ do
      it "org A cannot read org B workflow" $ do
        headersB <- authHeader "adminb@example.com" "password"
        let wfReq = object [
              "name" .= ("Org B Wf"::String),
              "initialStateId" .= mkId 20,
              "states" .= [
                object ["id" .= mkId 20, "name" .= ("State B1"::String), "isTerminal" .= False]
              ],
              "transitions" .= ([]::[Value])
              ]
        res <- request "POST" "/api/v1/workflows" ((mk "Content-Type", "application/json") : headersB) (encode wfReq)
        liftIO $ statusCode (simpleStatus res) `shouldBe` 201
        wfDto <- liftIO $ requireJust "Expected WorkflowDTO" (decode (simpleBody res))

        headersA <- authHeader "admin@example.com" "password"
        let wfPath = B.append "/api/v1/workflows/" (fromString $ show $ respWfId wfDto)
        request "GET" wfPath headersA "" `shouldRespondWith` 404


    describe "List Endpoints" $ do
      it "lists workflows with tenant isolation" $ do
        headersA <- authHeader "admin@example.com" "password"

        let wfReqA = object [
              "name" .= ("WfA"::String),
              "initialStateId" .= mkId 11,
              "states" .= [ object ["id" .= mkId 11, "name" .= ("Draft"::String), "isTerminal" .= False] ],
              "transitions" .= ([]::[Value])
              ]
        resA <- request "POST" "/api/v1/workflows" ((mk "Content-Type", "application/json") : headersA) (encode wfReqA)
        _ <- liftIO $ requireJust "Expected WfA" (decode (simpleBody resA) :: Maybe WorkflowDTO)

        headersB <- authHeader "adminb@example.com" "password"
        let wfReqB = object [
              "name" .= ("WfB"::String),
              "initialStateId" .= mkId 22,
              "states" .= [ object ["id" .= mkId 22, "name" .= ("Draft"::String), "isTerminal" .= False] ],
              "transitions" .= ([]::[Value])
              ]
        resB <- request "POST" "/api/v1/workflows" ((mk "Content-Type", "application/json") : headersB) (encode wfReqB)
        _ <- liftIO $ requireJust "Expected WfB" (decode (simpleBody resB) :: Maybe WorkflowDTO)

        listRespA <- request "GET" "/api/v1/workflows" headersA ""
        listA <- liftIO $ requireJust "Expected list A" (decode (simpleBody listRespA) :: Maybe [WorkflowDTO])
        liftIO $ length (filter (\w -> respWfName w == "WfA") listA) `shouldBe` 1
        liftIO $ length (filter (\w -> respWfName w == "WfB") listA) `shouldBe` 0

        listRespB <- request "GET" "/api/v1/workflows" headersB ""
        listB <- liftIO $ requireJust "Expected list B" (decode (simpleBody listRespB) :: Maybe [WorkflowDTO])
        liftIO $ length (filter (\w -> respWfName w == "WfB") listB) `shouldBe` 1
        liftIO $ length (filter (\w -> respWfName w == "WfA") listB) `shouldBe` 0

      it "lists instances with tenant isolation" $ do
        headersA <- authHeader "admin@example.com" "password"

        let wfReqA = object [
              "name" .= ("WfInsts"::String),
              "initialStateId" .= mkId 111,
              "states" .= [ object ["id" .= mkId 111, "name" .= ("Draft"::String), "isTerminal" .= False] ],
              "transitions" .= ([]::[Value])
              ]
        resA <- request "POST" "/api/v1/workflows" ((mk "Content-Type", "application/json") : headersA) (encode wfReqA)
        wfA <- liftIO $ requireJust "Expected WfA" (decode (simpleBody resA) :: Maybe WorkflowDTO)

        let actPath = B.append "/api/v1/workflows/" (B.append (fromString $ show $ respWfId wfA) "/activate")
        _ <- request "POST" actPath headersA ""

        let instPath = B.append "/api/v1/workflows/" (B.append (fromString $ show $ respWfId wfA) "/instances")
        _ <- request "POST" instPath headersA ""
        _ <- request "POST" instPath headersA ""

        listInstsResp <- request "GET" instPath headersA ""
        instsA <- liftIO $ requireJust "Expected insts A" (decode (simpleBody listInstsResp) :: Maybe [WorkflowInstanceDTO])
        liftIO $ length instsA `shouldBe` 2

        headersB <- authHeader "adminb@example.com" "password"
        badListResp <- request "GET" instPath headersB ""
        liftIO $ statusCode (simpleStatus badListResp) `shouldBe` 404

    describe "Workflow & Instances" $ do
      it "lifecycle works" $ do
        headersA <- authHeader "admin@example.com" "password"
        let wfReq = object [
              "name" .= ("Active Wf"::String),
              "initialStateId" .= mkId 30,
              "states" .= [
                object ["id" .= mkId 30, "name" .= ("S1"::String), "isTerminal" .= False],
                object ["id" .= mkId 31, "name" .= ("S2"::String), "isTerminal" .= True]
              ],
              "transitions" .= [
                object ["id" .= mkId 32, "sourceStateId" .= mkId 30, "targetStateId" .= mkId 31, "action" .= ("Approve"::String), "requiredPermission" .= ("TransitionInstance"::String)]
              ]
              ]
        res <- request "POST" "/api/v1/workflows" ((mk "Content-Type", "application/json") : headersA) (encode wfReq)
        liftIO $ statusCode (simpleStatus res) `shouldBe` 201
        wfDto <- liftIO $ requireJust "Expected WorkflowDTO" (decode (simpleBody res))

        let actPath = B.append "/api/v1/workflows/" (B.append (fromString $ show $ respWfId wfDto) "/activate")
        request "POST" actPath headersA "" `shouldRespondWith` 200

        let instPath = B.append "/api/v1/workflows/" (B.append (fromString $ show $ respWfId wfDto) "/instances")
        res2 <- request "POST" instPath headersA ""
        liftIO $ statusCode (simpleStatus res2) `shouldBe` 201
        instDto <- liftIO $ requireJust "Expected WorkflowInstanceDTO" (decode (simpleBody res2))

        let transPath = B.append "/api/v1/instances/" (B.append (fromString $ show $ respInstId instDto) "/transition")
        res3 <- request "POST" transPath ((mk "Content-Type", "application/json") : headersA) (encode $ object ["action" .= ("Approve"::String), "expectedVersion" .= (1::Int)])
        liftIO $ statusCode (simpleStatus res3) `shouldBe` 200

        let auditPath = B.append "/api/v1/instances/" (B.append (fromString $ show $ respInstId instDto) "/audit")
        res4 <- request "GET" auditPath headersA ""
        liftIO $ statusCode (simpleStatus res4) `shouldBe` 200
        auditDtos <- liftIO $ requireJust "Expected [AuditEventDTO]" (decode (simpleBody res4) :: Maybe [AuditEventDTO])
        liftIO $ length auditDtos `shouldBe` 1


      it "enforces optimistic concurrency (stale client -> 409)" $ do
        headersA <- authHeader "admin@example.com" "password"
        let wfReq = object [
              "name" .= ("Concurrency Wf"::String),
              "initialStateId" .= mkId 50,
              "states" .= [
                object ["id" .= mkId 50, "name" .= ("S1"::String), "isTerminal" .= False],
                object ["id" .= mkId 51, "name" .= ("S2"::String), "isTerminal" .= False],
                object ["id" .= mkId 52, "name" .= ("S3"::String), "isTerminal" .= True]
              ],
              "transitions" .= [
                object ["id" .= mkId 53, "sourceStateId" .= mkId 50, "targetStateId" .= mkId 51, "action" .= ("Approve1"::String), "requiredPermission" .= ("TransitionInstance"::String)],
                object ["id" .= mkId 54, "sourceStateId" .= mkId 50, "targetStateId" .= mkId 52, "action" .= ("Approve2"::String), "requiredPermission" .= ("TransitionInstance"::String)]
              ]
              ]
        res <- request "POST" "/api/v1/workflows" ((mk "Content-Type", "application/json") : headersA) (encode wfReq)
        wfDto <- liftIO $ requireJust "Expected WorkflowDTO" (decode (simpleBody res))

        let actPath = B.append "/api/v1/workflows/" (B.append (fromString $ show $ respWfId wfDto) "/activate")
        _ <- request "POST" actPath headersA ""

        let instPath = B.append "/api/v1/workflows/" (B.append (fromString $ show $ respWfId wfDto) "/instances")
        res2 <- request "POST" instPath headersA ""
        instDto <- liftIO $ requireJust "Expected WorkflowInstanceDTO" (decode (simpleBody res2))

        let transPath = B.append "/api/v1/instances/" (B.append (fromString $ show $ respInstId instDto) "/transition")
        -- First valid transition, expectedVersion = 1
        res3 <- request "POST" transPath ((mk "Content-Type", "application/json") : headersA) (encode $ object ["action" .= ("Approve1"::String), "expectedVersion" .= (1::Int)])
        liftIO $ statusCode (simpleStatus res3) `shouldBe` 200

        -- Second transition with STALE client expectedVersion = 1
        res4 <- request "POST" transPath ((mk "Content-Type", "application/json") : headersA) (encode $ object ["action" .= ("Approve2"::String), "expectedVersion" .= (1::Int)])
        liftIO $ statusCode (simpleStatus res4) `shouldBe` 409

        -- Verify audit count is 1
        let auditPath = B.append "/api/v1/instances/" (B.append (fromString $ show $ respInstId instDto) "/audit")
        res5 <- request "GET" auditPath headersA ""
        auditDtos <- liftIO $ requireJust "Expected [AuditEventDTO]" (decode (simpleBody res5) :: Maybe [AuditEventDTO])
        liftIO $ length auditDtos `shouldBe` 1

    describe "Error Contract" $ do
      it "returns 401 JSON" $ do
        res <- get "/api/v1/me"
        liftIO $ simpleBody res `shouldBe` "{\"error\":{\"code\":\"UNAUTHORIZED\",\"message\":\"Invalid credentials.\"}}"

      it "returns 404 JSON for missing resource" $ do
        headersA <- authHeader "admin@example.com" "password"
        res <- request "GET" "/api/v1/workflows/00000000-0000-0000-0000-000000000000" headersA ""
        liftIO $ simpleBody res `shouldBe` "{\"error\":{\"code\":\"NOT_FOUND\",\"message\":\"The requested workflow was not found.\"}}"

    describe "OpenAPI" $ do
      it "exposes openapi.json" $ do
        res <- get "/api/v1/openapi.json"
        liftIO $ statusCode (simpleStatus res) `shouldBe` 200

  with (return appFailing) $ do
    describe "Atomicity" $ do
      it "fails transition atomically without persisting changes" $ do
        headersA <- authHeader "admin@example.com" "password"
        -- 1. Create Workflow
        let wfReq = object [
              "name" .= ("Atomicity Wf"::String),
              "initialStateId" .= mkId 40,
              "states" .= [
                object ["id" .= mkId 40, "name" .= ("S1"::String), "isTerminal" .= False],
                object ["id" .= mkId 41, "name" .= ("S2"::String), "isTerminal" .= True]
              ],
              "transitions" .= [
                object ["id" .= mkId 42, "sourceStateId" .= mkId 40, "targetStateId" .= mkId 41, "action" .= ("Approve"::String), "requiredPermission" .= ("TransitionInstance"::String)]
              ]
              ]
        res <- request "POST" "/api/v1/workflows" ((mk "Content-Type", "application/json") : headersA) (encode wfReq)
        liftIO $ statusCode (simpleStatus res) `shouldBe` 201
        wfDto <- liftIO $ requireJust "Expected WorkflowDTO" (decode (simpleBody res))
        -- 2. Activate
        _ <- request "POST" (B.append "/api/v1/workflows/" (B.append (fromString $ show $ respWfId wfDto) "/activate")) headersA ""
        -- 3. Create Instance
        res2 <- request "POST" (B.append "/api/v1/workflows/" (B.append (fromString $ show $ respWfId wfDto) "/instances")) headersA ""
        instDto <- liftIO $ requireJust "Expected WorkflowInstanceDTO" (decode (simpleBody res2))
        -- 4. Execute transition on FAILING app
        res3 <- request "POST" (B.append "/api/v1/instances/" (B.append (fromString $ show $ respInstId instDto) "/transition")) ((mk "Content-Type", "application/json") : headersA) (encode $ object ["action" .= ("Approve"::String), "expectedVersion" .= (1::Int)])
        -- 5. Should fail 500
        liftIO $ statusCode (simpleStatus res3) `shouldBe` 500
        -- 6. Verify via normal app that state is unchanged
        res4 <- request "GET" (B.append "/api/v1/instances/" (fromString $ show $ respInstId instDto)) headersA ""
        instDto2 <- liftIO $ requireJust "Expected WorkflowInstanceDTO" (decode (simpleBody res4))
        liftIO $ respInstState instDto2 `shouldBe` mkId 40
