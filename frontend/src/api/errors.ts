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
  try {
    const body = await response.json();
    if (body?.error?.code && body?.error?.message) {
      return new AppError(body.error.code, body.error.message, response.status);
    }
    return new AppError('UNKNOWN', JSON.stringify(body), response.status);
  } catch {
    return new AppError(
      'NETWORK_ERROR',
      response.statusText || `HTTP ${response.status}`,
      response.status,
    );
  }
}
