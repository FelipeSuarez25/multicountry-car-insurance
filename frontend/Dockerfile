# Stage 1: build the Angular application (production configuration).
FROM node:24.22.3-alpine3.24 AS build
WORKDIR /app
ENV NG_CLI_ANALYTICS=false CI=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx ng build --configuration production

# Stage 2: serve it with nginx and proxy /api to Strapi (ADR-0002).
FROM nginx:1.29.8-alpine
# Processed by the image's envsubst at container start into /etc/nginx/conf.d/default.conf.
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
# Address of Strapi inside the compose network, without a trailing slash. Override at run time.
ENV STRAPI_UPSTREAM=http://strapi:1337
EXPOSE 80
