module FlowForge.Domain.Authorization (hasPermission) where

import FlowForge.Domain.Types

hasPermission :: Role -> Permission -> Bool
hasPermission Admin _ = True
hasPermission Manager p = p `elem` 
  [ CreateWorkflow
  , ReadWorkflow
  , UpdateWorkflow
  , CreateInstance
  , ReadInstance
  , TransitionInstance
  , ReadAudit
  ]
hasPermission Member p = p `elem`
  [ ReadWorkflow
  , CreateInstance
  , ReadInstance
  , TransitionInstance
  ]
hasPermission Viewer p = p `elem`
  [ ReadWorkflow
  , ReadInstance
  , ReadAudit
  ]
