-- | FlowForge Backend Entry Point
--
-- This is the minimal starting point for the FlowForge backend.
-- It proves that:
--   1. GHC compiles Haskell code on this machine
--   2. Cabal resolves dependencies and builds the executable
--   3. The executable runs successfully
--
-- In later phases, this will be replaced with the Servant API server.
module Main where

-- | Entry point. Prints a startup confirmation message.
--
-- Type signature:
--   main :: IO ()
--
-- 'IO ()' means:
--   - This function performs side effects (IO)
--   - It returns unit '()' — i.e., nothing meaningful
--
-- Every Haskell program must have a 'main' function of type 'IO ()'.
-- This is the boundary between pure Haskell and the outside world.
main :: IO ()
main = do
  putStrLn "========================================="
  putStrLn "  FlowForge Backend"
  putStrLn "  Version: 0.1.0.0"
  putStrLn "  Status:  Environment verified"
  putStrLn "  GHC:     9.6.7"
  putStrLn "========================================="
  putStrLn ""
  putStrLn "Haskell toolchain is working correctly."
  putStrLn "Ready for Phase 1: Product Definition."
