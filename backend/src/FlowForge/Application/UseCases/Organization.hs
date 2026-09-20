{-# LANGUAGE OverloadedStrings #-}
module FlowForge.Application.UseCases.Organization
  ( checkPerm
  , getOrganizationUC
  , addOrganizationMemberUC
  , updateOrganizationMemberRoleUC
  , removeOrganizationMemberUC
  ) where

import FlowForge.Domain.Types
import FlowForge.Domain.Authorization (hasPermission)
import FlowForge.Application.Error
import FlowForge.Application.Ports
import Control.Monad.Except (ExceptT(..), runExceptT)

checkPerm :: Monad m => Role -> Permission -> UserId -> ExceptT AppError m ()
checkPerm role perm userId =
  if hasPermission role perm
    then return ()
    else throwE (Unauthorized userId)
  where
    throwE = ExceptT . return . Left

getOrganizationUC :: Monad m => UserRepository m -> OrganizationId -> UserId -> Role -> m (Either AppError Organization)
getOrganizationUC repo orgId userId role = runExceptT $ do
  -- Any member can read organization metadata (they wouldn't get a role otherwise)
  ExceptT $ getOrganization repo orgId

addOrganizationMemberUC :: Monad m => UserRepository m -> OrganizationId -> UserId -> Role -> UserId -> Role -> m (Either AppError OrganizationMember)
addOrganizationMemberUC repo orgId actorId actorRole targetUserId targetRole = runExceptT $ do
  checkPerm actorRole ManageOrganization actorId
  
  -- ensure user exists
  _ <- ExceptT $ getUserById repo targetUserId
  
  -- add member
  ExceptT $ addOrganizationMember repo orgId targetUserId targetRole

updateOrganizationMemberRoleUC :: Monad m => UserRepository m -> OrganizationId -> UserId -> Role -> UserId -> Role -> m (Either AppError OrganizationMember)
updateOrganizationMemberRoleUC repo orgId actorId actorRole targetUserId targetRole = runExceptT $ do
  checkPerm actorRole ManageOrganization actorId
  
  -- If demoting an admin, ensure not the last one
  if targetRole /= Admin
    then do
       c <- ExceptT $ countAdmins repo orgId
       -- Is this user currently an admin?
       currentRole <- ExceptT $ getOrganizationMembership repo orgId targetUserId
       if currentRole == Admin && c <= 1
         then ExceptT $ return $ Left $ BusinessRuleViolation "Cannot demote the final Admin"
         else return ()
    else return ()
    
  ExceptT $ updateOrganizationMemberRole repo orgId targetUserId targetRole

removeOrganizationMemberUC :: Monad m => UserRepository m -> OrganizationId -> UserId -> Role -> UserId -> m (Either AppError ())
removeOrganizationMemberUC repo orgId actorId actorRole targetUserId = runExceptT $ do
  checkPerm actorRole ManageOrganization actorId
  
  currentRole <- ExceptT $ getOrganizationMembership repo orgId targetUserId
  if currentRole == Admin
    then do
       c <- ExceptT $ countAdmins repo orgId
       if c <= 1
         then ExceptT $ return $ Left $ BusinessRuleViolation "Cannot remove the final Admin"
         else return ()
    else return ()
    
  ExceptT $ removeOrganizationMember repo orgId targetUserId
