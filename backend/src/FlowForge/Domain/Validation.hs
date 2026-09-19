module FlowForge.Domain.Validation (validateWorkflow) where

import FlowForge.Domain.Types
import FlowForge.Domain.Error
import qualified Data.Set as Set

findDuplicate :: Ord a => [a] -> Maybe a
findDuplicate = go Set.empty
  where
    go _ [] = Nothing
    go seen (x:xs)
      | Set.member x seen = Just x
      | otherwise = go (Set.insert x seen) xs

validateWorkflow :: Workflow -> Either DomainError ()
validateWorkflow w = do
  -- Check duplicate states by ID
  let stateIds = map wsId (wStates w)
  case findDuplicate stateIds of
    Just sid -> Left $ DuplicateState sid
    Nothing -> Right ()

  -- Check duplicate state names
  let stateNames = map wsName (wStates w)
  case findDuplicate stateNames of
    Just _ -> Left DuplicateStateName
    Nothing -> Right ()

  -- Check initial state exists
  if not (wInitialStateId w `elem` stateIds)
    then Left $ InvalidInitialState (wInitialStateId w)
    else Right ()

  -- Check transitions (by ID)
  let transIds = map wtId (wTransitions w)
  case findDuplicate transIds of
    Just tid -> Left $ DuplicateTransition tid
    Nothing -> Right ()

  -- Check transitions (by logic: source + action)
  let transLogic = map (\t -> (wtSourceStateId t, wtAction t)) (wTransitions w)
  case findDuplicate transLogic of
    Just (sid, act) -> Left $ DuplicateTransitionLogic sid act
    Nothing -> Right ()

  -- Check dangling transitions
  let stateIdSet = Set.fromList stateIds
  mapM_ (\t -> do
    if not (Set.member (wtSourceStateId t) stateIdSet)
      then Left $ DanglingTransitionSource (wtId t) (wtSourceStateId t)
      else Right ()
    if not (Set.member (wtTargetStateId t) stateIdSet)
      then Left $ DanglingTransitionTarget (wtId t) (wtTargetStateId t)
      else Right ()
    ) (wTransitions w)
  
  Right ()
