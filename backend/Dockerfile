# Stage 1: Build the Haskell executable
FROM haskell:9.6 AS builder

WORKDIR /opt/build

# Install dependencies required for the build (libpq-dev for postgresql-simple)
RUN apt-get update && apt-get install -y libpq-dev && rm -rf /var/lib/apt/lists/*

# Update cabal index
RUN cabal update

# Cache the dependencies by copying only the cabal files first
COPY ./flowforge-backend.cabal ./
RUN cabal build --only-dependencies -j4

# Copy the rest of the source code
COPY . .

# Build the executable
RUN cabal build -j4

# Extract the binary to a known location
RUN cp $(cabal list-bin exe:flowforge-backend) /opt/build/flowforge-backend

# Stage 2: Create the lightweight runtime image
FROM debian:bullseye-slim

# Install runtime dependencies (libpq5 for PostgreSQL client library, libgmp10 for Haskell RTS)
RUN apt-get update && \
    apt-get install -y --no-install-recommends libpq5 libgmp10 ca-certificates curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Run as non-root user
RUN useradd -m -s /bin/bash flowforge
USER flowforge

# Copy the compiled executable from the builder
COPY --from=builder /opt/build/flowforge-backend /app/flowforge-backend

# The server listens on 8080 by default (configurable via PORT env var)
EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8080/api/v1/health || exit 1

CMD ["/app/flowforge-backend"]
