{-# LANGUAGE DataKinds #-}
{-# LANGUAGE OverloadedStrings #-}

module FlowForge.Api.Server
  ( appWith
  ) where

import Servant
import Servant.Auth.Server
import Control.Monad.Reader (runReaderT)
import Control.Monad.IO.Class (liftIO)
import Network.Wai (Middleware, requestHeaders, requestMethod, rawPathInfo, responseStatus, mapResponseHeaders)
import Network.HTTP.Types.Status (statusCode)
import Data.CaseInsensitive (mk)
import qualified Data.ByteString.Char8 as B8
import Data.Time.Clock (getCurrentTime, diffUTCTime)
import Data.UUID.V4 (nextRandom)
import Data.UUID (toASCIIBytes)
import System.IO (hPutStrLn, stderr)
import Network.Wai.Middleware.Cors (cors, corsRequestHeaders, corsMethods, corsOrigins, CorsResourcePolicy(..), simpleCorsResourcePolicy)

import FlowForge.Api.Handlers (server, AppHandler)
import FlowForge.Api.Routes (rootAPI)
import FlowForge.Infrastructure.Database (DbPool, SqlM)

import FlowForge.Api.Env (AppEnv(..))
import FlowForge.Application.Ports (AuditRepository)

nt :: DbPool -> AuditRepository SqlM -> AppHandler a -> Handler a
nt pool auditRepo action = do
  -- We don't checkout a connection here for the whole request!
  -- We just pass the pool. Wait! AppEnv takes Connection!
  -- If AppEnv takes Connection, we are checking out a connection for the ENTIRE request!
  -- Let's just create a connection checkout block.
  env <- liftIO $ return $ AppEnv pool auditRepo
  runReaderT action env

observabilityMiddleware :: Middleware
observabilityMiddleware app req respondMw = do
  start <- getCurrentTime
  reqId <- case lookup (mk "X-Request-ID") (requestHeaders req) of
             Just rid -> return rid
             Nothing -> toASCIIBytes <$> nextRandom

  let reqWithId = req

  app reqWithId $ \res -> do
    end <- getCurrentTime
    let durationMs = round (diffUTCTime end start * 1000) :: Int
        status = statusCode (responseStatus res)
        method = B8.unpack (requestMethod req)
        path = B8.unpack (rawPathInfo req)
        rid = B8.unpack reqId

    hPutStrLn stderr $ "[rid:" ++ rid ++ "] " ++ method ++ " " ++ path ++ " " ++ show status ++ " " ++ show durationMs ++ "ms"

    let resWithHeader = mapResponseHeaders (\headers -> (mk "X-Request-ID", reqId) : headers) res
    respondMw resWithHeader

appWith :: DbPool -> JWTSettings -> AuditRepository SqlM -> Maybe B8.ByteString -> Application
appWith pool jwtCfg auditRepo corsOrigin =
  let
    cfg = defaultCookieSettings :. jwtCfg :. EmptyContext
    serverWithContext = hoistServerWithContext
                          rootAPI
                          (Proxy :: Proxy '[CookieSettings, JWTSettings])
                          (nt pool auditRepo)
                          (server jwtCfg)

    corsPolicy = simpleCorsResourcePolicy
      { corsOrigins = case corsOrigin of
          Nothing -> Nothing
          Just origin -> Just ([origin], True)
      , corsMethods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
      , corsRequestHeaders = ["Authorization", "Content-Type", "X-Organization-Id"]
      }

  in observabilityMiddleware $ cors (const $ Just corsPolicy) $ serveWithContext rootAPI cfg serverWithContext
