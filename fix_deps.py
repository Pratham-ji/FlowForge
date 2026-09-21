import os

files_to_fix = [
    'frontend/src/features/instances/InstanceList.tsx',
    'frontend/src/features/instances/InstanceDetail.tsx',
    'frontend/src/features/audit/InstanceAudit.tsx',
    'frontend/src/features/workflows/WorkflowDetail.tsx'
]

for path in files_to_fix:
    with open(path, 'r') as f:
        content = f.read()
    
    # Restore useCallback
    content = content.replace("import { useEffect, useState }", "import { useEffect, useState, useCallback }")
    
    if 'WorkflowDetail.tsx' in path:
        content = content.replace("const loadWorkflow = async () => {", "const loadWorkflow = useCallback(async () => {")
        content = content.replace("  useEffect(() => {\n    loadWorkflow();\n  }, [workflowId, loadWorkflow]);", "  };\n\n  useEffect(() => {\n    loadWorkflow();\n  }, [workflowId, loadWorkflow]);")
    elif 'InstanceList.tsx' in path:
        content = content.replace("const loadData = async () => {", "const loadData = useCallback(async () => {")
        content = content.replace("  useEffect(() => {\n    loadData();\n  }, [workflowId, loadData]);", "  };\n\n  useEffect(() => {\n    loadData();\n  }, [workflowId, loadData]);")
    elif 'InstanceDetail.tsx' in path or 'InstanceAudit.tsx' in path:
        content = content.replace("const loadData = async () => {", "const loadData = useCallback(async () => {")
        content = content.replace("  useEffect(() => {\n    loadData();\n  }, [instanceId, loadData]);", "  };\n\n  useEffect(() => {\n    loadData();\n  }, [instanceId, loadData]);")
        
    # We must remove the extra }; that we just added if the script matches poorly.
    # Actually, a better approach is regex to capture the function body.
