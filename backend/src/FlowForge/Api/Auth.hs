{-# LANGUAGE OverloadedStrings #-}

module FlowForge.Api.Auth
  ( requireAuth
  
  , JWTSettings
  , defaultJWTSettings
  ) where

import Servant.Server (ServerError(..))
import Servant.Auth.Server (AuthResult(..), JWTSettings, defaultJWTSettings)
import FlowForge.Api.Types (AuthenticatedUser)
import FlowForge.Api.Errors (mapAppError)
import FlowForge.Application.Error (AppError(InvalidCredentials))

requireAuth :: AuthResult AuthenticatedUser -> Either ServerError AuthenticatedUser
requireAuth (Authenticated user) = Right user
requireAuth _ = Left $ mapAppError InvalidCredentials -- This handles Unauthenticated, BadPassword etc.

-- We don't really generate here because servant-auth handles it with `makeJWT` inside the handler.
-- We can just rely on `makeJWT`.
