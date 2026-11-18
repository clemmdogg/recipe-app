# The web version of the app, served by Caddy. Built by deploy/docker-compose.yml.
# Caddy's settings (HTTPS, headers, the API proxy) are in deploy/Caddyfile.

# 1. Build the web version as plain files (web.output "single" in app.json).
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Expo writes the API address into the JavaScript at build time, so it is a build argument.
ARG EXPO_PUBLIC_API_URL
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL
RUN test -n "$EXPO_PUBLIC_API_URL" || (echo "EXPO_PUBLIC_API_URL is missing" && exit 1)
RUN npx expo export --platform web --output-dir dist

# 2. Caddy with the built files in /srv.
FROM caddy:2
COPY --from=build /app/dist /srv
