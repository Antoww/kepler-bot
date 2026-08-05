FROM denoland/deno:2.1.7

# Build argument for version
ARG VERSION=dev
ENV BOT_VERSION=$VERSION
ENV FONTCONFIG_FILE=/etc/fonts/fonts.conf
ENV FONTCONFIG_PATH=/etc/fonts

RUN apt-get update \
    && apt-get install -y --no-install-recommends fontconfig fonts-dejavu-core fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/* \
    && fc-cache -f

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
