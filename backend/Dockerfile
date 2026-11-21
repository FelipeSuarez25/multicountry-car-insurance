FROM node:24-bookworm-slim

ENV NODE_ENV=production \
    DATA_DIR=/data \
    DATABASE_CLIENT=sqlite \
    DATABASE_FILENAME=/data/data.db
WORKDIR /app

COPY package.json package-lock.json ./
# devDependencies are needed for `strapi build` (admin panel, TypeScript)
RUN npm ci --include=dev

COPY . .
RUN npm run build && mkdir -p /data && chown -R node:node /app /data

USER node
VOLUME /data
EXPOSE 1337
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "run", "start"]
