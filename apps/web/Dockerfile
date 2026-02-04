FROM node:22-slim AS build

WORKDIR /repo
RUN corepack enable

COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm -C apps/web build


FROM nginx:1.27-alpine AS runner

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html

EXPOSE 80

