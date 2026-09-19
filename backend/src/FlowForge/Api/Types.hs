{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE OverloadedStrings #-}

module FlowForge.Api.Types
  ( AuthenticatedUser(..)
  , RoleDTO(..)
  , toDomainRole
  , fromDomainRole
  ) where

import GHC.Generics
import Data.Aeson
import Data.OpenApi (ToSchema)
import Data.UUID (UUID)
import Servant.Auth.Server (FromJWT, ToJWT)
import FlowForge.Domain.Types (Role(..))

data RoleDTO = AdminDTO | ManagerDTO | MemberDTO | ViewerDTO
  deriving (Eq, Show, Generic)

instance ToJSON RoleDTO where
  toJSON AdminDTO = String "Admin"
  toJSON ManagerDTO = String "Manager"
  toJSON MemberDTO = String "Member"
  toJSON ViewerDTO = String "Viewer"

instance FromJSON RoleDTO where
  parseJSON (String "Admin") = return AdminDTO
  parseJSON (String "Manager") = return ManagerDTO
  parseJSON (String "Member") = return MemberDTO
  parseJSON (String "Viewer") = return ViewerDTO
  parseJSON _ = fail "Invalid Role"

instance ToSchema RoleDTO

toDomainRole :: RoleDTO -> Role
toDomainRole AdminDTO = Admin
toDomainRole ManagerDTO = Manager
toDomainRole MemberDTO = Member
toDomainRole ViewerDTO = Viewer

fromDomainRole :: Role -> RoleDTO
fromDomainRole Admin = AdminDTO
fromDomainRole Manager = ManagerDTO
fromDomainRole Member = MemberDTO
fromDomainRole Viewer = ViewerDTO

data AuthenticatedUser = AuthenticatedUser
  { auUserId :: UUID
  , auOrgId  :: UUID
  , auRole   :: RoleDTO
  } deriving (Eq, Show, Generic)

instance ToJSON AuthenticatedUser
instance FromJSON AuthenticatedUser
instance ToJWT AuthenticatedUser
instance FromJWT AuthenticatedUser
