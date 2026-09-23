with open('frontend/src/api/errors.ts', 'r') as f:
    c = f.read()

new_normalize = """export async function normalizeError(response: Response): Promise<AppError> {
  let code = 'UNKNOWN';
  let message = `HTTP ${response.status}`;
  
  try {
    const body = await response.json();
    if (body?.error?.code && body?.error?.message) {
      code = body.error.code;
      message = body.error.message;
    } else {
      message = JSON.stringify(body);
    }
  } catch {
    if (response.status === 404) message = 'The requested resource could not be found.';
    else if (response.status === 403) message = "You don't have permission to perform this action.";
    else if (response.status === 401) message = 'Your session has expired. Please log in again.';
    else if (response.status === 409) message = 'This workflow was changed by someone else. Refresh to load the latest version.';
    else if (response.status >= 500) message = 'We encountered an internal server error. Please try again.';
    else if (response.status === 400) message = 'The request was invalid or the workspace could not be loaded.';
    else if (!response.status) message = "We couldn't reach FlowForge. Check your connection and try again.";
    else message = response.statusText || `HTTP ${response.status}`;
  }
  
  // Overwrite generic backend messages if they are not user friendly
  if (message.includes('HTTP 400') || message.includes('Bad Request')) {
    message = 'Your workspace could not be loaded. Please refresh and try again.';
  }
  if (response.status === 409) {
    message = 'This resource was changed by someone else. Refresh to load the latest version.';
  }
  if (response.status === 403) {
    message = "You don't have permission to perform this action.";
  }

  return new AppError(code, message, response.status);
}"""

import re
c = re.sub(r'export async function normalizeError.*?\n}', new_normalize, c, flags=re.DOTALL)

with open('frontend/src/api/errors.ts', 'w') as f:
    f.write(c)

