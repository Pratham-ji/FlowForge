{-# LANGUAGE OverloadedStrings #-}

module FlowForge.Application.UseCases.Auth
  ( authenticateUserUC
  ) where

import Control.Monad.Except
import Control.Monad.Trans.Class (lift)
import Data.Text (Text)

import FlowForge.Domain.Types
import FlowForge.Application.Error
import FlowForge.Application.Ports

authenticateUserUC 
  :: Monad m 
  => UserRepository m 
  -> PasswordVerifier m 
  -> Text 
  -> Text 
  -> m (Either AppError User)
authenticateUserUC uRepo pVerifier email password = runExceptT $ do
  (user, hash) <- ExceptT $ getUserByEmail uRepo email
  isValid <- lift $ verifyPassword pVerifier password hash
  if isValid
    then return user
    else throwError InvalidCredentials
