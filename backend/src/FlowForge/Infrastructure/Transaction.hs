module FlowForge.Infrastructure.Transaction (transactionPort) where

import FlowForge.Application.Ports
import FlowForge.Application.Error
import FlowForge.Infrastructure.Database
import Control.Exception (Exception, try, throwIO)
import Control.Monad.Trans.Reader (ask, runReaderT)
import Control.Monad.IO.Class (liftIO)
import qualified Database.PostgreSQL.Simple as PG

data RollbackException = RollbackException AppError deriving Show
instance Exception RollbackException

transactionPort :: TransactionPort SqlM
transactionPort = TransactionPort
  { withTransaction = \action -> do
      conn <- ask
      res <- liftIO $ try $ PG.withTransaction conn $ do
        r <- runReaderT action conn
        case r of
          Left err -> throwIO (RollbackException err)
          Right val -> return val
      case res of
        Left (RollbackException err) -> return (Left err)
        Right val -> return (Right val)
  }
