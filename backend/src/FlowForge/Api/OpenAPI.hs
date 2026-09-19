{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE FlexibleInstances #-}
{-# LANGUAGE MultiParamTypeClasses #-}
{-# LANGUAGE TypeOperators #-}
{-# LANGUAGE DataKinds #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# OPTIONS_GHC -fno-warn-orphans #-}

module FlowForge.Api.OpenAPI
  ( openApiSchema
  ) where

import Servant.OpenApi
import Data.OpenApi
import Control.Lens
import Data.Proxy (Proxy(..))
import Servant.API
import Servant.Auth.Server

import FlowForge.Api.Routes (flowForgeAPI)
import FlowForge.Api.Types (AuthenticatedUser)

instance HasOpenApi api => HasOpenApi (Auth '[JWT] AuthenticatedUser :> api) where
  toOpenApi _ = toOpenApi (Proxy :: Proxy api)

openApiSchema :: OpenApi
openApiSchema = toOpenApi flowForgeAPI
  & info . title   .~ "FlowForge API"
  & info . version .~ "1.0"
  & info . description ?~ "Typed Workflow & Business Process Platform"
