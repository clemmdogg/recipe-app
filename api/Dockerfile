# The API as a container image, built by deploy/docker-compose.yml.
# Debian-based (not Alpine), because argon2 ships ready-built binaries for it.

# 1. Install all dependencies and compile TypeScript to JavaScript.
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# 2. The image that runs: only production dependencies and the compiled code.
FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
# Don't run as root inside the container.
USER node
EXPOSE 3000
# Settings come from environment variables set in docker-compose.yml; there is no .env file here.
CMD ["node", "dist/server.js"]
