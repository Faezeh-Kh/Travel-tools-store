# Stage 1: Install dependencies
FROM node:24-bookworm-slim AS deps

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

# Stage 2: Build Next.js
FROM node:24-bookworm-slim AS build

WORKDIR /app

COPY --from=deps /app/node_modules/ ./node_modules

# copy frontend project into /app
COPY . .

# get the arg needed for building the frontend image or use empty value
ARG NEXT_PUBLIC_API_BASE_URL=""

 # Read by next build, which compiles the value into the browser bundle ("" = same origin).
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL

# stops Next.js from sending anonymous usage telemetry
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# Stage 3: Run Next.js
FROM node:24-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=build --chown=node /app/.next/standalone ./

COPY --from=build --chown=node /app/.next/static ./.next/static/

COPY --from=build --chown=node /app/public ./public/

USER node

EXPOSE 3000

CMD ["node", "server.js"]
