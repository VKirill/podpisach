# Docker Reference

> Source: Context7 — /docker/docs (Docker official documentation)
> Updated: 2026-03-11

## Multi-Stage Builds

Multi-stage builds introduce multiple stages in a Dockerfile, each with a specific purpose, allowing you to run different parts of a build in multiple different environments. By separating the build environment from the final runtime environment, you can significantly reduce the image size and attack surface, which is especially beneficial for applications with large build dependencies.

### Complete Multi-Stage Node.js Dockerfile

```dockerfile
# syntax=docker/dockerfile:1

# Build arguments
ARG NODE_VERSION=18
ARG ALPINE_VERSION=3.19

# Base stage with dependencies
FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS base
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    curl \
    tini \
    && rm -rf /var/cache/apk/*

# Dependencies stage
FROM base AS deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --production=false

# Build stage
FROM deps AS build
COPY . .
RUN npm run build

# Test stage
FROM build AS test
RUN npm run test && npm run lint

# Production dependencies
FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --production --ignore-scripts

# Final production image
FROM base AS production
LABEL maintainer="team@example.com"
LABEL org.opencontainers.image.source="https://github.com/org/repo"

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

# Copy production dependencies and built assets
COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nextjs:nodejs /app/dist ./dist
COPY --from=build --chown=nextjs:nodejs /app/public ./public

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Security: run as non-root
USER nextjs

# Expose port
EXPOSE 3000
```

### Key Best Practices

- Use `ARG` for version pinning at the top
- Use `--mount=type=cache` for npm/yarn cache between builds (BuildKit feature)
- Separate production deps from dev deps
- Run tests in a separate stage (doesn't affect final image)
- Create non-root user for security
- Use `COPY --chown` to set proper ownership
- Use Alpine-based images for smaller footprint

## Docker Compose — Complete Service Configuration

```yaml
services:
  app:
    # Build configuration
    build:
      context: .
      dockerfile: Dockerfile.prod
      args:
        - VERSION=1.0.0
      target: production
      cache_from:
        - myapp:cache
      labels:
        - "com.example.description=Production build"

    # Image to use (if not building)
    image: myorg/myapp:${TAG:-latest}

    # Container name (optional)
    container_name: myapp-production

    # Port mappings
    ports:
      - "8080:80"                    # host:container
      - "127.0.0.1:9090:9090"        # bind to localhost only
      - "3000-3005:3000-3005"        # port range

    # Environment configuration
    environment:
      NODE_ENV: production
      LOG_LEVEL: info
    env_file:
      - .env
      - .env.production

    # Volume mounts
    volumes:
      - ./src:/app/src:ro            # bind mount (read-only)
      - app-data:/app/data           # named volume
      - type: bind
        source: ./config
        target: /app/config
        read_only: true

    # Networking
    networks:
      frontend:
        aliases:
          - web
      backend:
        ipv4_address: 172.16.238.10

    # Service dependencies
    depends_on:
      db:
        condition: service_healthy
        restart: true
      cache:
        condition: service_started

    # Health check
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

    # Restart policy
    restart: unless-stopped

    # Resource limits
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 256M
      replicas: 2

    # Logging configuration
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

    # Security options
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    read_only: true
    user: "1000:1000"
```

## Docker Compose — Multi-Service with Monitoring

Example with Golang API, Prometheus, and Grafana demonstrating networks, volumes, health checks.

```yaml
services:
  api:
    container_name: go-api
    build:
      context: .
      dockerfile: Dockerfile
    image: go-api:latest
    ports:
      - 8000:8000
    networks:
      - go-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 5
    develop:
      watch:
        - path: .
          action: rebuild

  prometheus:
    container_name: prometheus
    image: prom/prometheus:v2.55.0
    volumes:
      - ./Docker/prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - 9090:9090
    networks:
      - go-network

  grafana:
    container_name: grafana
    image: grafana/grafana:11.3.0
    volumes:
      - ./Docker/grafana.yml:/etc/grafana/provisioning/datasources/datasource.yaml
      - grafana-data:/var/lib/grafana
    ports:
      - 3000:3000
    networks:
      - go-network
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=password

volumes:
  grafana-data:

networks:
  go-network:
    driver: bridge
```

## Health Checks

Health checks allow Docker to monitor the health status of running containers.

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost/health"]
  interval: 30s        # how often to run the check
  timeout: 10s         # max time for check to complete
  retries: 3           # consecutive failures before "unhealthy"
  start_period: 60s    # grace period before checks count
```

Common health check commands:
- HTTP: `["CMD", "curl", "-f", "http://localhost/health"]`
- HTTP (no curl): `["CMD", "wget", "-q", "--spider", "http://localhost/health"]`
- TCP: `["CMD", "nc", "-z", "localhost", "5432"]`
- Redis: `["CMD", "redis-cli", "ping"]`
- PostgreSQL: `["CMD-SHELL", "pg_isready -U postgres"]`

## Volumes

### Named Volumes
```yaml
volumes:
  app-data:           # named volume (managed by Docker)
```

### Bind Mounts
```yaml
volumes:
  - ./src:/app/src:ro            # bind mount, read-only
  - type: bind
    source: ./config
    target: /app/config
    read_only: true
```

## Networks

```yaml
networks:
  frontend:
    aliases:
      - web                       # service aliases on this network
  backend:
    ipv4_address: 172.16.238.10  # static IP assignment

networks:
  go-network:
    driver: bridge               # default network driver
```

## Security Best Practices

1. **Non-root user**: Always create and switch to a non-root user
   ```dockerfile
   RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001 -G nodejs
   USER nextjs
   ```

2. **Drop capabilities**: Remove all Linux capabilities, add back only what's needed
   ```yaml
   security_opt:
     - no-new-privileges:true
   cap_drop:
     - ALL
   cap_add:
     - NET_BIND_SERVICE
   ```

3. **Read-only filesystem**: Mount the root filesystem as read-only
   ```yaml
   read_only: true
   ```

4. **Bind to localhost only**: Restrict port exposure
   ```yaml
   ports:
     - "127.0.0.1:9090:9090"
   ```

5. **Pin image versions**: Always use specific version tags, not `latest`

6. **Use `.dockerignore`**: Exclude sensitive files and build artifacts

## BuildKit Features

Enable with `DOCKER_BUILDKIT=1` or `# syntax=docker/dockerfile:1` at top of Dockerfile.

### Cache mounts
```dockerfile
RUN --mount=type=cache,target=/root/.npm npm ci
```

### Secret mounts
```dockerfile
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm ci
```

### Build targets
```bash
docker build --target production -t myapp:prod .
```

## Resource Limits

```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 1G
    reservations:
      cpus: '0.5'
      memory: 256M
  replicas: 2
```

## Logging Configuration

```yaml
logging:
  driver: json-file
  options:
    max-size: "10m"    # max size per log file
    max-file: "3"      # number of log files to keep
```

## Service Dependencies

```yaml
depends_on:
  db:
    condition: service_healthy    # wait for health check to pass
    restart: true                 # restart if dependency restarts
  cache:
    condition: service_started    # just wait for container to start
```

## Develop Watch (Docker Compose Watch)

```yaml
develop:
  watch:
    - path: .
      action: rebuild            # rebuild image on file changes
    - path: ./src
      action: sync               # sync files without rebuilding
    - path: package.json
      action: rebuild
```

## Image Optimization Checklist

1. Use multi-stage builds to separate build-time and runtime
2. Use Alpine-based images (smaller base)
3. Combine RUN commands to reduce layers
4. Order instructions from least to most frequently changed (cache optimization)
5. Use `.dockerignore` to exclude unnecessary files
6. Clean up package manager caches (`rm -rf /var/cache/apk/*`)
7. Use `--mount=type=cache` for build caches (BuildKit)
8. Pin dependency versions for reproducible builds
9. Use `COPY` instead of `ADD` (unless you need tar extraction)
10. Set `NODE_ENV=production` before `npm ci` for Node.js apps
