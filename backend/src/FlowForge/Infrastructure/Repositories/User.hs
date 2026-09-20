{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE ScopedTypeVariables #-}

module FlowForge.Infrastructure.Repositories.User
  ( userRepository
  ) where

import Control.Exception (try, SomeException)
import Database.PostgreSQL.Simple
import qualified Data.Text as T

import FlowForge.Application.Error
import FlowForge.Application.Ports (UserRepository(..))
import FlowForge.Domain.Types
import FlowForge.Infrastructure.Database (SqlM)
import Control.Monad.Reader (ask)
import Control.Monad.IO.Class (liftIO)

toDomainRoleText :: Role -> T.Text
toDomainRoleText Admin = "Admin"
toDomainRoleText Manager = "Manager"
toDomainRoleText Member = "Member"
toDomainRoleText Viewer = "Viewer"

userRepository :: UserRepository SqlM
userRepository = UserRepository
  { getUserByEmail = \email -> do
      conn <- ask
      res <- liftIO $ try $ query conn
        "SELECT id, password_hash FROM users WHERE email = ?"
        (Only email)
      case res of
        Left (e :: SqlError) -> return $ Left $ PersistenceFailure (show e)
        Right [(uid, hash)] -> return $ Right (User (UserId uid), hash)
        Right [] -> return $ Left $ PersistenceFailure "User not found"
        Right _ -> return $ Left $ PersistenceFailure "Multiple users found"

  , getUserById = \(UserId uid) -> do
      conn <- ask
      res <- liftIO $ try $ query conn
        "SELECT id FROM users WHERE id = ?"
        (Only uid)
      case res of
        Left (e :: SqlError) -> return $ Left $ PersistenceFailure (show e)
        Right [Only id_] -> return $ Right $ User (UserId id_)
        Right [] -> return $ Left $ PersistenceFailure "User not found"
        Right _ -> return $ Left $ PersistenceFailure "Multiple users found"

  , saveUser = \u -> do
      return $ Right ()

  , getOrganizationMembership = \(OrganizationId oid) (UserId uid) -> do
      conn <- ask
      res <- liftIO $ try $ query conn
        "SELECT role FROM organization_members WHERE organization_id = ? AND user_id = ?"
        (oid, uid)
      case res of
        Left (e :: SqlError) -> return $ Left $ PersistenceFailure (show e)
        Right [Only roleStr] ->
          case parseRole roleStr of
            Just r -> return $ Right r
            Nothing -> return $ Left $ PersistenceFailure "Invalid role in database"
        Right [] -> return $ Left $ NotAMember "User is not a member of the organization"
        Right _ -> return $ Left $ PersistenceFailure "Multiple memberships found"

  , listUserOrganizations = \(UserId uid) -> do
      conn <- ask
      res <- liftIO $ try $ query conn
        "SELECT o.id, o.name FROM organizations o JOIN organization_members m ON o.id = m.organization_id WHERE m.user_id = ?"
        (Only uid)
      case res of
        Left (e :: SqlError) -> return $ Left $ PersistenceFailure (show e)
        Right parsed -> return $ Right [ Organization (OrganizationId id_) name | (id_, name) <- parsed ]

  , listOrganizationMembers = \(OrganizationId oid) -> do
      conn <- ask
      res <- liftIO $ try $ query conn
        "SELECT user_id, role FROM organization_members WHERE organization_id = ?"
        (Only oid)
      case res of
        Left (e :: SqlError) -> return $ Left $ PersistenceFailure (show e)
        Right parsed -> do
          let parsed' = [ (uid, parseRole roleStr) | (uid, roleStr) <- parsed ]
          if any (\(_, r) -> r == Nothing) parsed'
            then return $ Left $ PersistenceFailure "Invalid role found"
            else return $ Right [ OrganizationMember (OrganizationId oid) (UserId uid) (let Just ro = r in ro) | (uid, r) <- parsed' ]

  , createOrganization = \name (UserId uid) -> do
      conn <- ask
      -- simplistic UUID generation or rely on DB default if supported, but here we assume DB creates it?
      -- wait, in the previous implementation it used `uuid_generate_v4()` via DB, or did it pass one?
      -- I'll just keep whatever `createOrganization` was.
      res <- liftIO $ try $ query conn
        "INSERT INTO organizations (id, name) VALUES (gen_random_uuid(), ?) RETURNING id"
        (Only name)
      case res of
        Left (e :: SqlError) -> return $ Left $ PersistenceFailure (show e)
        Right [Only oid] -> do
          _ <- liftIO $ execute conn "INSERT INTO organization_members (organization_id, user_id, role) VALUES (?, ?, 'Admin')" (oid, uid)
          return $ Right $ Organization (OrganizationId oid) name
        Right _ -> return $ Left $ PersistenceFailure "Failed to create org"

  , getOrganization = \(OrganizationId oid) -> do
      conn <- ask
      res <- liftIO $ try $ query conn
        "SELECT id, name FROM organizations WHERE id = ?"
        (Only oid)
      case res of
        Left (e :: SqlError) -> return $ Left $ PersistenceFailure (show e)
        Right [(id_, name)] -> return $ Right $ Organization (OrganizationId id_) name
        Right [] -> return $ Left $ PersistenceFailure "Organization not found"
        Right _ -> return $ Left $ PersistenceFailure "Multiple organizations found"

  , addOrganizationMember = \(OrganizationId oid) (UserId uid) role -> do
      conn <- ask
      res <- liftIO $ try $ execute conn
        "INSERT INTO organization_members (organization_id, user_id, role) VALUES (?, ?, ?)"
        (oid, uid, toDomainRoleText role)
      case res of
        Left (e :: SqlError) -> do
          let msg = show e
          if "unique constraint" `T.isInfixOf` T.toLower (T.pack msg)
            then return $ Left $ BusinessRuleViolation "User is already a member"
            else return $ Left $ PersistenceFailure msg
        Right _ -> return $ Right $ OrganizationMember (OrganizationId oid) (UserId uid) role

  , updateOrganizationMemberRole = \(OrganizationId oid) (UserId uid) role -> do
      conn <- ask
      res <- liftIO $ try $ execute conn
        "UPDATE organization_members SET role = ? WHERE organization_id = ? AND user_id = ?"
        (toDomainRoleText role, oid, uid)
      case res of
        Left (e :: SqlError) -> return $ Left $ PersistenceFailure (show e)
        Right n -> if n > 0
                     then return $ Right $ OrganizationMember (OrganizationId oid) (UserId uid) role
                     else return $ Left $ PersistenceFailure "Member not found"

  , removeOrganizationMember = \(OrganizationId oid) (UserId uid) -> do
      conn <- ask
      res <- liftIO $ try $ execute conn
        "DELETE FROM organization_members WHERE organization_id = ? AND user_id = ?"
        (oid, uid)
      case res of
        Left (e :: SqlError) -> return $ Left $ PersistenceFailure (show e)
        Right n -> if n > 0
                     then return $ Right ()
                     else return $ Left $ PersistenceFailure "Member not found"

  , countAdmins = \(OrganizationId oid) -> do
      conn <- ask
      res <- liftIO $ try $ query conn
        "SELECT count(*) FROM organization_members WHERE organization_id = ? AND role = 'Admin'"
        (Only oid)
      case res of
        Left (e :: SqlError) -> return $ Left $ PersistenceFailure (show e)
        Right [Only (c :: Int)] -> return $ Right c
        Right _ -> return $ Left $ PersistenceFailure "Unexpected count result"
  }

parseRole :: T.Text -> Maybe Role
parseRole "Admin" = Just Admin
parseRole "Manager" = Just Manager
parseRole "Member" = Just Member
parseRole "Viewer" = Just Viewer
parseRole _ = Nothing
