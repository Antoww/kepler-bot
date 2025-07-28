FROM denoland/deno:2.1.7

WORKDIR /app

# Copy dependency files
COPY deno.json package.json ./

# Copy source code
COPY . .

# Cache dependencies
RUN deno cache index.ts

# Run the application
CMD ["deno", "run", "--allow-all", "index.ts"]
