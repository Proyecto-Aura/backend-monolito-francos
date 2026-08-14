####################################
#       STAGE 1: INSTALL DEPS      #
####################################
FROM node:26-alpine as deps

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

####################################
#       STAGE 2: BUILD             #
####################################
FROM node:26-alpine as build

WORKDIR /app

RUN corepack enable

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm exec prisma generate
RUN pnpm build


####################################
#       STAGE 3: PROD             #
####################################
FROM node:26-alpine as prod

WORKDIR /app

ENV NODE_ENV=production

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --prod --frozen-lockfile

COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prismao

EXPOSE 3000

CMD [ "pnpm", "start:prod" ]