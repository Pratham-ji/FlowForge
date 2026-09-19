{-# LANGUAGE OverloadedStrings #-}
{-# OPTIONS_GHC -Wno-deprecations #-}

module FlowForge.Infrastructure.Database 
  ( DbPool
  , SqlM
  , runSqlM
  , initDbPool
  , withDbTransaction
  , closeDbPool
  ) where

import Database.PostgreSQL.Simple
import Data.Pool
import Data.Time.Clock (NominalDiffTime)
import qualified Data.ByteString.Char8 as B
import Control.Monad.Trans.Reader (ReaderT, runReaderT)

type DbPool = Pool Connection
type SqlM = ReaderT Connection IO

runSqlM :: DbPool -> SqlM a -> IO a
runSqlM pool action = withResource pool $ \conn -> runReaderT action conn

initDbPool :: String -> IO DbPool
initDbPool connStr = 
  createPool (connectPostgreSQL (B.pack connStr)) close 1 (10 :: NominalDiffTime) 10

withDbTransaction :: DbPool -> IO a -> IO a
withDbTransaction pool action = withResource pool $ \conn -> withTransaction conn action

closeDbPool :: DbPool -> IO ()
closeDbPool = destroyAllResources
