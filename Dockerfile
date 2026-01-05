FROM denoland/deno:2.1.7

# Build argument for version
ARG VERSION=dev
ENV BOT_VERSION=$VERSION

WORKDIR /app

# Copy dependency files
COPY deno.json package.json ./

# Copy source code
COPY . .

# Cache dependencies
RUN deno cache index.ts

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD deno eval "Deno.exit(0)"

# Run the application
CMD ["deno", "run", "--allow-all", "index.ts"]
