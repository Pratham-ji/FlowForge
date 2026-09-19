{-# LANGUAGE OverloadedStrings #-}

module FlowForge.Config
  ( AppConfig(..)
  , loadConfig
  ) where

import qualified Data.ByteString.Char8 as B
import System.Environment (lookupEnv)

data Environment = Development | Production deriving (Show, Eq)

data AppConfig = AppConfig
  { acDbConnString :: B.ByteString
  , acServerPort   :: Int
  , acEnvironment  :: Environment
  } deriving (Show)

loadConfig :: IO AppConfig
loadConfig = do
  envStr <- lookupEnv "ENV"
  dbStr <- lookupEnv "DATABASE_URL"
  portStr <- lookupEnv "PORT"
  
  let env = if envStr == Just "production" then Production else Development
  
  connStr <- case (env, dbStr) of
    (Production, Nothing) -> error "DATABASE_URL is required in production!"
    (_, Just db)          -> return (B.pack db)
    (Development, Nothing)-> return "host=localhost dbname=flowforge_test user=postgres password=postgres port=5432"

  return AppConfig
    { acDbConnString = connStr
    , acServerPort   = maybe 8080 read portStr
    , acEnvironment  = env
    }
