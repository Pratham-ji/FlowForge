import re

def wrap_usecallback(filepath, func_name, deps):
    with open(filepath, 'r') as f:
        content = f.read()

    # Add useCallback import if missing
    if 'useCallback' not in content:
        content = content.replace("import { useEffect, useState }", "import { useEffect, useState, useCallback }")

    # Find the function definition
    pattern = rf"const {func_name} = async \(\) => {{(.*?)}};\s+useEffect\("
    
    def repl(m):
        body = m.group(1)
        return f"const {func_name} = useCallback(async () => {{{body}}}, [{deps}]);\n\n  useEffect("

    content = re.sub(pattern, repl, content, flags=re.DOTALL)
    
    with open(filepath, 'w') as f:
        f.write(content)

wrap_usecallback('frontend/src/features/instances/InstanceList.tsx', 'loadData', 'workflowId')
wrap_usecallback('frontend/src/features/instances/InstanceDetail.tsx', 'loadData', 'instanceId')
wrap_usecallback('frontend/src/features/audit/InstanceAudit.tsx', 'loadData', 'instanceId')
wrap_usecallback('frontend/src/features/workflows/WorkflowDetail.tsx', 'loadWorkflow', 'workflowId')
