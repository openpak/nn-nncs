# syntax=docker/dockerfile:1
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
USER node
COPY --from=build /app/dist ./dist
COPY package.json .
# UDP: 10025 and 10125 (both roles), 33334 and 33335 (nncs1), 10225 relay from the peer.
CMD ["node", "--enable-source-maps", "dist/server.js"]
