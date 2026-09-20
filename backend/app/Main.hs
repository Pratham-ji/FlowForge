{-# LANGUAGE OverloadedStrings #-}

module Main where
import System.Environment (lookupEnv)
import qualified Data.ByteString.Char8 as B

import Network.Wai.Handler.Warp (run)
import FlowForge.Infrastructure.Database (initDbPool)
import Servant.Auth.Server (defaultJWTSettings, generateKey, fromSecret)

import FlowForge.Config
import FlowForge.Api.Server (appWith)
import FlowForge.Infrastructure.Repositories.Audit (auditRepository)

main :: IO ()
main = do
  config <- loadConfig
  pool <- initDbPool (B.unpack $ acDbConnString config)

  jwtKeyStr <- lookupEnv "JWT_SECRET"
  key <- case (acEnvironment config, jwtKeyStr) of
    (Production, Nothing) -> error "JWT_SECRET is required in production!"
    (_, Just str)         -> return $ fromSecret (B.pack str)
    (Development, Nothing)-> generateKey
  let jwtSettings = defaultJWTSettings key

  putStrLn $ "Starting FlowForge server on port " ++ show (acServerPort config)
  run (acServerPort config) (appWith config pool jwtSettings auditRepository)
