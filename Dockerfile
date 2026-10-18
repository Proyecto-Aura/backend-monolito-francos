####################################
#       STAGE 1: INSTALL DEPS      #
####################################
FROM node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1 AS deps

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

####################################
#       STAGE 2: BUILD             #
####################################
FROM node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1 AS build

WORKDIR /app

RUN corepack enable

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm exec prisma generate
RUN pnpm build

# La poda va aquí y no en el stage final: borrar en una capa posterior no
# reduce la imagen, solo marca los archivos como invisibles. Al podar antes
# del COPY, producción recibe el árbol ya limpio.
RUN pnpm prune --prod

####################################
#       STAGE 3: PROD              #
####################################
FROM node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1 AS prod

WORKDIR /app

ENV NODE_ENV=production

COPY package.json ./

COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/prisma ./prisma
# Prisma 7 lee la URL de la BD desde prisma.config.ts (no desde schema.prisma),
# así que `prisma migrate deploy` dentro del contenedor lo necesita.
COPY --from=build --chown=node:node /app/prisma.config.ts ./

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
    CMD wget --spider -q http://localhost:3000/api/v1/health/live || exit 1

CMD ["node", "dist/main.js"]
