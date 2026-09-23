/**
 * Normalized application-level error. All API errors are converted to this shape
 * before reaching UI code.
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly status: number;

  constructor(
    code: string,
    message: string,
    status: number,
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isConflict(): boolean {
    return this.status === 409;
  }

  get isValidationError(): boolean {
    return this.status === 422;
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }
}

/**
 * Converts a fetch Response into a normalized AppError.
 * Attempts to parse the backend's standard error JSON envelope;
 * falls back to status text if the body is not JSON.
 */
export async function normalizeError(response: Response): Promise<AppError> {
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
    if (response.status === 404) message = 'This resource no longer exists.';
    else if (response.status === 403) message = "You don't have permission to do that.";
    else if (response.status === 401) message = 'Your session has expired. Please log in again.';
    else if (response.status === 409) message = 'This workflow changed while you were editing it. Reload the latest version.';
    else if (response.status >= 500) message = 'We encountered an internal server error. Please try again.';
    else if (response.status === 400) message = 'Your workspace could not be loaded.';
    else if (response.status === 422) message = 'Please complete the required fields.';
    else if (!response.status) message = "We couldn't reach FlowForge. Check your connection and try again.";
    else message = response.statusText || `HTTP ${response.status}`;
  }

  // Overwrite generic backend messages if they are not user friendly
  if (message.includes('HTTP 400') || message.includes('Bad Request')) {
    message = 'Your workspace could not be loaded.';
  }
  if (response.status === 409) {
    message = 'This workflow changed while you were editing it. Reload the latest version.';
  }
  if (response.status === 403) {
    message = "You don't have permission to do that.";
  }
  if (response.status === 404) {
    message = "This resource no longer exists.";
  }
  if (response.status === 422) {
    message = "Please complete the required fields.";
  }

  return new AppError(code, message, response.status);
}
