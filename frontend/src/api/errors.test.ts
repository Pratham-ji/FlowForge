import { describe, it, expect } from 'vitest';
import { normalizeError, AppError } from './errors';

describe('normalizeError', () => {
  it('parses standard backend JSON errors', async () => {
    const mockResponse = new Response(
      JSON.stringify({
        error: { code: 'UNAUTHORIZED', message: 'Missing token' },
      }),
      { status: 401, statusText: 'Unauthorized' }
    );
    const err = await normalizeError(mockResponse);
    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe('UNAUTHORIZED');
    expect(err.message).toBe('Missing token');
    expect(err.status).toBe(401);
    expect(err.isUnauthorized).toBe(true);
  });

  it('falls back to status text if body is not standard JSON', async () => {
    const mockResponse = new Response('<html>Error</html>', {
      status: 500,
      statusText: 'Internal Server Error',
    });
    const err = await normalizeError(mockResponse);
    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe('UNKNOWN');
    expect(err.message).toBe('We encountered an internal server error. Please try again.');
    expect(err.status).toBe(500);
    expect(err.isServerError).toBe(true);
  });
});
