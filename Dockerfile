FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_SITE_URL=https://diyatmoko.my.id
ENV VITE_SITE_URL=$VITE_SITE_URL
RUN npm run build

FROM nginxinc/nginx-unprivileged:stable-alpine AS runtime
COPY --from=build /app/dist/ /usr/share/nginx/html/
COPY --from=build /app/deploy/generated/nginx.conf /etc/nginx/conf.d/default.conf
USER 101
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD wget -q -O - http://127.0.0.1:8080/health.txt || exit 1
