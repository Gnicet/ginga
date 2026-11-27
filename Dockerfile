FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4173 PRACA_DATA_DIR=/data
RUN mkdir /data && chown node:node /data
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json backup.mjs accounts.mjs mural.mjs rooms.mjs server.mjs ./
COPY src/data/postais.json ./src/data/postais.json
USER node
EXPOSE 4173
CMD ["node","server.mjs"]
