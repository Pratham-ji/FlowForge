{-# LANGUAGE OverloadedStrings #-}

module FlowForge.Infrastructure.Auth.Password
  ( passwordVerifier, hashPasswordIO
  
  ) where

import Data.Text (Text)
import Data.Password.Bcrypt

import FlowForge.Application.Ports
import FlowForge.Infrastructure.Database (SqlM)

passwordVerifier :: PasswordVerifier SqlM
passwordVerifier = PasswordVerifier
  { verifyPassword = \plain hashTxt -> return $
      case mkPassword plain of
        plainPwd -> case checkPassword plainPwd (PasswordHash hashTxt) of
          PasswordCheckSuccess -> True
          PasswordCheckFail    -> False
  }

hashPasswordIO :: Text -> IO Text
hashPasswordIO plain = do
  hash <- hashPasswordWithParams 10 (mkPassword plain)
  return $ unPasswordHash hash
