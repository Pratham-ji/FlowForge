import glob
import re

files = glob.glob('frontend/src/**/*.tsx', recursive=True)

for filepath in files:
    with open(filepath, 'r') as f:
        c = f.read()
    
    # "Create Workflow"
    c = re.sub(r'<Button type="submit" isLoading={isSubmitting}(.*?)>\s*Create Workflow\s*</Button>', r'<Button type="submit" isLoading={isSubmitting}\1>\n                {isSubmitting ? "Creating..." : "Create Workflow"}\n              </Button>', c, flags=re.DOTALL)
    
    # "Add Member" in WorkspaceSettings (uses adding)
    c = re.sub(r'<button\n              type="submit"\n              disabled={adding}(.*?)\n            >\n              Add Member\n            </button>', r'<button\n              type="submit"\n              disabled={adding}\1\n            >\n              {adding ? "Adding..." : "Add Member"}\n            </button>', c, flags=re.DOTALL)

    with open(filepath, 'w') as f:
        f.write(c)

