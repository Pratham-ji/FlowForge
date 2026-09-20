# ADR 007: Error Handling and HTTP Mapping

## Status
Accepted

## Context
Internal backend errors (e.g., domain rule violations, database persistence failures, concurrent modification conflicts) must be translated safely to the frontend without leaking internal stack traces or database schema details.

## Decision
The backend Application layer strictly returns internal `AppError` types. The API layer (`Handlers.hs`) acts as a boundary, mapping these to standard HTTP status codes (401, 403, 404, 409, 422) and sanitizing the response into an `ApiErrorWrapper` JSON payload.
The frontend API client (`normalizeError`) translates these HTTP responses back into JavaScript `AppError` objects for the UI to display in `ErrorState` components.

## Consequences
Provides a clear, standardized contract. 422 is consistently used for domain validation, 409 for conflicts. The client gracefully handles failures without exposing sensitive backend internals.

## Alternatives Considered
Throwing HTTP exceptions directly from within the use cases. Rejected because it violates domain/application purity by coupling business rules to HTTP delivery concepts.
