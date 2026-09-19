{-# LANGUAGE OverloadedStrings #-}

module FlowForge.Api.Env
  ( AppEnv(..)
  ) where

import FlowForge.Infrastructure.Database (DbPool)
import FlowForge.Application.Ports (AuditRepository)
import FlowForge.Infrastructure.Database (SqlM)

data AppEnv = AppEnv
  { aePool :: DbPool
  , aeAuditRepo :: AuditRepository SqlM
  }
