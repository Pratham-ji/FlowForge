{-# LANGUAGE OverloadedStrings #-}

module FlowForge.Infrastructure.Repositories.User
  ( userRepository
  ) where

import Control.Exception (try, SomeException)
import Database.PostgreSQL.Simple
import Data.Text (Text)

import FlowForge.Domain.Types
import FlowForge.Application.Error
import FlowForge.Application.Ports
import FlowForge.Infrastructure.Database (SqlM)
import Control.Monad.Reader (ask, liftIO)

userRepository :: UserRepository SqlM
userRepository = UserRepository
  { getUserByEmail = \email -> do
      conn <- ask
      res <- liftIO $ try $ query conn 
        "SELECT id, organization_id, role, password_hash FROM users WHERE email = ?" 
        (Only email)
      case res of
        Left err -> return $ Left $ PersistenceFailure (show (err :: SomeException))
        Right [(uidUUID, oidUUID, roleStr, hash)] ->
          let uid = UserId uidUUID
              oid = OrganizationId oidUUID
          in 
          case parseRole roleStr of
            Just role -> return $ Right (User uid oid role, hash)
            Nothing   -> return $ Left $ PersistenceFailure "Invalid role in DB"
        Right [] -> return $ Left $ UserNotFound "User not found"
        Right _  -> return $ Left $ PersistenceFailure "Multiple users with same email"
  }

parseRole :: Text -> Maybe Role
parseRole "Admin" = Just Admin
parseRole "Manager" = Just Manager
parseRole "Member" = Just Member
parseRole "Viewer" = Just Viewer
parseRole _ = Nothing
